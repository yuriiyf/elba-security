import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import type { MicrosoftUser } from '@/connectors/microsoft/user/users';
import { getUsers } from '@/connectors/microsoft/user/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = (user: MicrosoftUser): User => ({
  id: user.id,
  email: user.mail || undefined,
  displayName: user.displayName || user.userPrincipalName,
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'teams-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'teams/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.USERS_SYNC_MAX_RETRY,
  },
  { event: 'teams/users.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt, skipToken } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
        tenantId: organisationsTable.tenantId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient(organisationId, organisation.region);

    const nextSkipToken = await step.run('paginate', async () => {
      const result = await getUsers({
        token: await decrypt(organisation.token),
        tenantId: organisation.tenantId,
        skipToken,
      });

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          tenantId: organisation.tenantId,
          invalidUsers: result.invalidUsers,
        });
      }

      await elba.users.update({
        users: result.validUsers.map(formatElbaUser),
      });

      return result.nextSkipToken;
    });

    if (nextSkipToken) {
      await step.sendEvent('sync-next-users-page', {
        name: 'teams/users.sync.requested',
        data: {
          ...event.data,
          skipToken: nextSkipToken,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    await elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() });

    return {
      status: 'completed',
    };
  }
);
