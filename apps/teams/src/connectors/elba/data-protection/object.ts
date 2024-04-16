import type { DataProtectionObject } from '@elba-security/sdk';
import type { MicrosoftMessage } from '@/connectors/microsoft/types';
import type { MessageMetadata } from './metadata';

export const convertISOToDate = (isoDate: string) => {
  return isoDate.split('T')[0];
};
export const formatDataProtectionObject = ({
  teamId,
  messageId,
  message,
  organisationId,
  membershipType,
  channelName,
  channelId,
  replyId,
}: {
  teamId: string;
  channelId: string;
  organisationId: string;
  messageId: string;
  replyId?: string;
  membershipType: string;
  channelName: string;
  message: Omit<MicrosoftMessage, 'replies@odata.nextLink' | 'replies'>;
}): DataProtectionObject => {
  const creationDate = convertISOToDate(message.createdDateTime);

  return {
    id: `${organisationId}:${message.id}`,
    name: `#${channelName} - ${creationDate}`,
    metadata: {
      teamId,
      organisationId,
      channelId,
      messageId,
      type: message.type,
      replyId: message.type === 'reply' ? replyId : undefined,
    } satisfies MessageMetadata,
    updatedAt: message.lastEditedDateTime ?? undefined,
    ownerId: message.from.user?.id || message.from.application?.id || '',
    permissions: [
      membershipType === 'shared'
        ? {
            type: 'anyone',
            id: 'anyone',
          }
        : {
            type: 'domain',
            id: 'domain',
          },
    ],
    url: message.webUrl,
    contentHash: message.etag,
  };
};
