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
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    onFailure: async ({ event, step }) => {
      const { organisationId, messageId } = event.data.event.data;

      await step.sendEvent('replies-sync-complete', {
        name: 'teams/replies.sync.completed',
        data: {
          messageId,
          organisationId,
        },
      });
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
  async ({ event, step, logger }) => {
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

    const { nextSkipToken, validReplies } = await step.run('paginate', async () => {
      const replies = await getReplies({
        token: await decrypt(organisation.token),
        teamId,
        skipToken,
        channelId,
        messageId,
      });

      if (replies.invalidReplies.length > 0) {
        logger.warn('Retrieved replies contains invalid data', {
          organisationId,
          tenantId: organisation.tenantId,
          invalidReplies: replies.invalidReplies,
        });
      }

      const filterReplies = replies.validReplies.filter((reply) => reply.messageType === 'message');

      return { nextSkipToken: replies.nextSkipToken, validReplies: filterReplies };
    });

    await step.run('elba-data-sync', async () => {
      const elbaClient = createElbaClient(organisationId, organisation.region);

      if (!validReplies.length) {
        return;
      }

      const objects = validReplies.map((reply) => {
        return formatDataProtectionObject({
          teamId,
          messageId,
          channelId,
          channelName,
          organisationId,
          membershipType,
          replyId: reply.id,
          message: reply,
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
