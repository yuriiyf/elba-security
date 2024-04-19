import { describe, expect, test, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import type { WebhookPayload } from '@/app/api/webhooks/microsoft/event-handler/service';
import { EventType, handleWebhook } from '@/app/api/webhooks/microsoft/event-handler/service';
import type { SubscriptionPayload } from '@/app/api/webhooks/microsoft/event-handler/types';

const channelData: SubscriptionPayload[] = [
  {
    subscriptionId: 'subscription-id-0',
    changeType: 'created',
    resource: "teams('team-id-0')/channels('channel-id-0')",
    tenantId: 'tenant-id-0',
    clientState: 'secret',
  },
  {
    subscriptionId: 'subscription-id-1',
    changeType: 'deleted',
    resource: "teams('team-id-1')/channels('channel-id-1')",
    tenantId: 'tenant-id-1',
    clientState: 'secret',
  },
];
const invalidData: SubscriptionPayload[] = [
  {
    subscriptionId: 'subscription-id-0',
    changeType: 'created',
    resource: "teams('team-id-0')",
    tenantId: 'tenant-id-0',
    clientState: 'secret',
  },
  {
    subscriptionId: 'subscription-id-1',
    changeType: 'deleted',
    resource: "channels('channel-id-1')",
    tenantId: 'tenant-id-1',
    clientState: 'secret',
  },
];

const messageData: SubscriptionPayload[] = [
  {
    subscriptionId: 'subscription-id-0',
    changeType: 'created',
    resource: "teams('team-id-0')/channels('channel-id-0')/messages('message-id-0')",
    tenantId: 'tenant-id-0',
    clientState: 'secret',
  },
  {
    subscriptionId: 'subscription-id-1',
    changeType: 'created',
    resource: "teams('team-id-1')/channels('channel-id-1')/messages('message-id-1')",
    tenantId: 'tenant-id-1',
    clientState: 'secret',
  },
];

const replyData: SubscriptionPayload[] = [
  {
    subscriptionId: 'subscription-id-0',
    changeType: 'created',
    resource:
      "teams('team-id-0')/channels('channel-id-0')/messages('message-id-0')/replies('reply-id-0')",
    tenantId: 'tenant-id-0',
    clientState: 'secret',
  },
  {
    subscriptionId: 'subscription-id-1',
    changeType: 'created',
    resource:
      "teams('team-id-1')/channels('channel-id-1')/messages('message-id-1')/replies('reply-id-1')",
    tenantId: 'tenant-id-1',
    clientState: 'secret',
  },
];

function createChannelPayload() {
  const objectsArray: WebhookPayload[] = [];

  for (let i = 0; i < 2; i++) {
    const obj: WebhookPayload = {
      teamId: `team-id-${i}`,
      channelId: `channel-id-${i}`,
      subscriptionId: `subscription-id-${i}`,
      tenantId: `tenant-id-${i}`,
      event: i % 2 === 0 ? EventType.ChannelCreated : EventType.ChannelDeleted,
    };
    objectsArray.push(obj);
  }

  return objectsArray;
}

const channelsPayload: WebhookPayload[] = createChannelPayload();

function createMessagePayload() {
  const objectsArray: WebhookPayload[] = [];

  for (let i = 0; i < 2; i++) {
    const obj: WebhookPayload = {
      teamId: `team-id-${i}`,
      channelId: `channel-id-${i}`,
      messageId: `message-id-${i}`,
      subscriptionId: `subscription-id-${i}`,
      tenantId: `tenant-id-${i}`,
      event: EventType.MessageCreated,
    };
    objectsArray.push(obj);
  }

  return objectsArray;
}

const messagePayload: WebhookPayload[] = createMessagePayload();

function createReplyPayload() {
  const objectsArray: WebhookPayload[] = [];

  for (let i = 0; i < 2; i++) {
    const obj: WebhookPayload = {
      teamId: `team-id-${i}`,
      channelId: `channel-id-${i}`,
      messageId: `message-id-${i}`,
      replyId: `reply-id-${i}`,
      subscriptionId: `subscription-id-${i}`,
      tenantId: `tenant-id-${i}`,
      event: EventType.ReplyCreated,
    };
    objectsArray.push(obj);
  }

  return objectsArray;
}

const replyPayload: WebhookPayload[] = createReplyPayload();

describe('handleWebhook', () => {
  test('should send an event when the payload has teamId and channelId', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(handleWebhook(channelData)).resolves.toBeUndefined();

    expect(send).toBeCalledWith(
      channelsPayload.map((payload) => ({
        name: 'teams/teams.webhook.event.received',
        data: {
          payload,
        },
      }))
    );
    expect(send).toBeCalledTimes(1);
  });

  test('should send an event when the payload has teamId, channelId and messageId', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(handleWebhook(messageData)).resolves.toBeUndefined();

    expect(send).toBeCalledWith(
      messagePayload.map((payload) => ({
        name: 'teams/teams.webhook.event.received',
        data: {
          payload,
        },
      }))
    );
    expect(send).toBeCalledTimes(1);
  });

  test('should send an event when the payload has teamId, channelId, messageId and replyId', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(handleWebhook(replyData)).resolves.toBeUndefined();

    expect(send).toBeCalledWith(
      replyPayload.map((payload) => ({
        name: 'teams/teams.webhook.event.received',
        data: {
          payload,
        },
      }))
    );
    expect(send).toBeCalledTimes(1);
  });

  test('should not send an event when the resource is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(handleWebhook(invalidData)).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(0);
  });

  test('should not send an event when no data is provided', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(handleWebhook([])).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(0);
  });
});
