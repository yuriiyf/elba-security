import { messageMetadataSchema } from '@/connectors/elba/data-protection/metadata';
import { inngest } from '@/inngest/client';

export const deleteDataProtectionObject = async ({
  organisationId,
  metadata,
}: {
  organisationId: string;
  metadata: unknown;
}) => {
  const messageMetadataResult = messageMetadataSchema.safeParse(metadata);

  if (!messageMetadataResult.success) {
    throw new Error('Invalid message metadata');
  }

  await inngest.send({
    name: 'teams/data_protection.delete_object.requested',
    data: {
      organisationId,
      metadata: messageMetadataResult.data,
    },
  });
};
