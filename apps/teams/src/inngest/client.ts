import { EventSchemas, type GetEvents, type GetFunctionInput, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import type { WebhookPayload } from '@/app/api/microsoft/event-handler/service';
import type { MessageMetadata } from '@/connectors/elba/data-protection/metadata';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

type InngestClient = typeof inngest;

export type GetInngestFunctionInput<T extends keyof GetEvents<InngestClient>> = GetFunctionInput<
  InngestClient,
  T
>;

export const inngest = new Inngest({
  id: 'teams',
  schemas: new EventSchemas().fromRecord<{
    'teams/teams.elba_app.installed': {
      data: {
        organisationId: string;
      };
    };
    'teams/token.refresh.triggered': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'teams/users.sync.triggered': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        skipToken: string | null;
      };
    };
    'teams/teams.sync.triggered': {
      data: {
        organisationId: string;
        skipToken: string | null;
        syncStartedAt: string;
        isFirstSync: boolean;
      };
    };
    'teams/channels.sync.triggered': {
      data: {
        organisationId: string;
        teamId: string;
      };
    };
    'teams/channels.sync.completed': {
      data: {
        organisationId: string;
        teamId: string;
      };
    };
    'teams/messages.sync.triggered': {
      data: {
        organisationId: string;
        skipToken?: string | null;
        teamId: string;
        channelId: string;
        channelName: string;
        membershipType: string;
      };
    };
    'teams/messages.sync.completed': {
      data: {
        organisationId: string;
        channelId: string;
      };
    };
    'teams/replies.sync.triggered': {
      data: {
        organisationId: string;
        skipToken?: string | null;
        teamId: string;
        channelId: string;
        messageId: string;
        channelName: string;
        membershipType: string;
      };
    };
    'teams/replies.sync.completed': {
      data: {
        organisationId: string;
        messageId: string;
      };
    };
    'teams/channels.subscription.triggered': {
      data: {
        organisationId: string;
      };
    };
    'teams/channel.subscription.triggered': {
      data: {
        teamId: string;
        channelId: string;
        organisationId: string;
        uniqueChannelInOrganisationId: string;
      };
    };
    'teams/teams.webhook.event.received': {
      data: {
        payload: WebhookPayload;
      };
    };
    'teams/subscription.refresh.triggered': {
      data: {
        subscriptionId: string;
        organisationId: string;
      };
    };
    'teams/data.protection.refresh.triggered': {
      data: {
        organisationId: string;
        metadata: MessageMetadata;
      };
    };
    'teams/data.protection.delete.triggered': {
      data: {
        organisationId: string;
        metadata: MessageMetadata;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
