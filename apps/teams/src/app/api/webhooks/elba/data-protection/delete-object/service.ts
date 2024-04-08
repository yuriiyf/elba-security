import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { deleteMessage } from '@/connectors/microsoft/messages/messages';
import { deleteReply } from '@/connectors/microsoft/replies/replies';
import { decrypt } from '@/common/crypto';
import { messageMetadataSchema } from '@/connectors/elba/data-protection/metadata';

export const deleteDataProtectionObject = async ({
  organisationId,
  metadata,
}: {
  organisationId: string;
  metadata: any; // eslint-disable-line -- metadata type is any
}) => {
  const messageMetadataResult = messageMetadataSchema.safeParse(metadata);

  if (!messageMetadataResult.success) {
    throw new Error('Invalid message metadata');
  }

  const { teamId, channelId, messageId, replyId } = messageMetadataResult.data;

  const [organisation] = await db
    .select({
      token: organisationsTable.token,
    })
    .from(organisationsTable)
    .where(eq(organisationsTable.id, organisationId));

  if (!organisation) {
    throw new Error(`Could not retrieve organisation with organisationId=${organisationId}`);
  }

  if (messageMetadataResult.data.type === 'message') {
    await deleteMessage({
      token: await decrypt(organisation.token),
      teamId,
      channelId,
      messageId,
    });
  }

  if (messageMetadataResult.data.type === 'reply' && replyId) {
    await deleteReply({
      token: await decrypt(organisation.token),
      teamId,
      channelId,
      messageId,
      replyId,
    });
  }
};
