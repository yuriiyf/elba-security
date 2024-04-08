import { describe, expect, test, vi } from 'vitest';
import { decrypt, encrypt } from '@/common/crypto';
import { deleteDataProtectionObject } from '@/app/api/webhooks/elba/data-protection/delete-object/service';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as messageConnector from '@/connectors/microsoft/messages/messages';
import * as replyConnector from '@/connectors/microsoft/replies/replies';
import type { MessageMetadata } from '@/connectors/elba/data-protection/metadata';

const token = 'token';
const encryptedToken = await encrypt(token);

const organisation = {
  id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  tenantId: 'tenant-id',
  region: 'us',
  token: encryptedToken,
};

const messageMetadata: MessageMetadata = {
  teamId: 'team-id',
  organisationId: organisation.id,
  channelId: 'channel-id',
  messageId: 'message-id',
  replyId: undefined,
  type: 'message',
};

const replyMetadata: MessageMetadata = {
  teamId: 'team-id',
  organisationId: organisation.id,
  channelId: 'channel-id',
  messageId: 'message-id',
  replyId: 'reply-id',
  type: 'reply',
};
describe('deleteDataProtectionObject', () => {
  test('should throw if the organization not received', async () => {
    await expect(
      deleteDataProtectionObject({ organisationId: organisation.id, metadata: messageMetadata })
    ).rejects.toThrowError();
  });

  test('should delete message object', async () => {
    await db.insert(organisationsTable).values(organisation);

    const deleteMessage = vi
      .spyOn(messageConnector, 'deleteMessage')
      .mockResolvedValue({ message: 'message was deleted' });

    await expect(
      deleteDataProtectionObject({ organisationId: organisation.id, metadata: messageMetadata })
    ).resolves.toBeUndefined();

    expect(deleteMessage).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: messageMetadata.teamId,
      channelId: messageMetadata.channelId,
      messageId: messageMetadata.messageId,
    });
    expect(deleteMessage).toBeCalledTimes(1);
  });

  test('should delete reply object', async () => {
    await db.insert(organisationsTable).values(organisation);

    const deleteReply = vi
      .spyOn(replyConnector, 'deleteReply')
      .mockResolvedValue({ message: 'reply was deleted' });

    await expect(
      deleteDataProtectionObject({ organisationId: organisation.id, metadata: replyMetadata })
    ).resolves.toBeUndefined();

    expect(deleteReply).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: replyMetadata.teamId,
      channelId: replyMetadata.channelId,
      messageId: replyMetadata.messageId,
      replyId: replyMetadata.replyId,
    });
    expect(deleteReply).toBeCalledTimes(1);
  });
});
