import type { DataProtectionObject } from '@elba-security/sdk';
import type { MicrosoftMessage } from '@/connectors/microsoft/types';
import type { MessageMetadata } from './metadata';

export const formatDataProtectionObject = ({
  teamId,
  messageId,
  message,
  organisationId,
  membershipType,
  channelName,
  channelId,
  timestamp,
}: {
  teamId: string;
  channelId: string;
  organisationId: string;
  messageId: string;
  membershipType: string;
  channelName: string;
  timestamp: string;
  message: MicrosoftMessage;
}): DataProtectionObject => {
  return {
    id: messageId,
    name: `#${channelName} - ${timestamp}`,
    metadata: {
      teamId,
      organisationId,
      channelId,
      messageId,
      type: message.type,
    } satisfies MessageMetadata,
    updatedAt: message.lastEditedDateTime ?? undefined,
    ownerId: message.from.user.id,
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
