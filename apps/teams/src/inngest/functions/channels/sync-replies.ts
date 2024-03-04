import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getReplies } from '@/connectors/microsoft/replies/replies';
import { createElbaClient } from '@/connectors/elba/client';
import { formatDataProtectionObject } from '@/connectors/elba/data-protection/object';

export const syncReplies = inngest.createFunction(
  {
    id: 'sync-replies',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'teams/teams.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.REPLIES_SYNC_MAX_RETRY,
  },
  { event: 'teams/replies.sync.triggered' },
  async ({ event, step }) => {
    const { organisationId, teamId, skipToken, channelId, messageId, membershipType, channelName } =
      event.data;

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

    const { nextSkipToken, replies } = await step.run('paginate', async () => {
      return getReplies({
        token: await decrypt(organisation.token),
        teamId,
        skipToken,
        channelId,
        messageId,
      });
    });

    const elbaClient = createElbaClient(organisationId, organisation.region);

    await step.run('elba-data-sync', async () => {
      if (!replies.length) {
        return;
      }

      const objects = replies.map((reply) => {
        const timestamp = new Date(reply.createdDateTime).getTime();

        return formatDataProtectionObject({
          teamId,
          messageId,
          channelId,
          channelName,
          organisationId,
          membershipType,
          message: reply,
          timestamp: String(timestamp),
        });
      });

      await elbaClient.dataProtection.updateObjects({ objects });
    });

    if (nextSkipToken) {
      await step.sendEvent('sync-next-replies-page', {
        name: 'teams/replies.sync.triggered',
        data: {
          ...event.data,
          skipToken: nextSkipToken,
        },
      });

      return {
        status: 'ongoing',
      };
    }
    await step.sendEvent('replies-sync-complete', {
      name: 'teams/replies.sync.completed',
      data: {
        messageId,
        organisationId,
      },
    });

    return {
      status: 'completed',
    };
  }
);
