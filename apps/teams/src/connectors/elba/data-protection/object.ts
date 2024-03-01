import type { DataProtectionObject } from '@elba-security/sdk';
import type { MicrosoftMessage } from '@/connectors/microsoft/messages/messages';
import type { MessageMetadata } from './metadata';

export const formatDataProtectionObject = ({
  teamId,
  channelId,
  messageId,
  organisationId,
  message,
  updatedAt,
  membershipType,
  channelName,
  timestamp,
  webUrl,
    etag
}: {
  teamId: string;
  channelId: string;
  organisationId: string;
  messageId: string;
  membershipType: string;
  message: MicrosoftMessage;
  updatedAt: string | null;
  channelName: string;
  timestamp: string;
  webUrl: string;
  etag:string
}): DataProtectionObject => {
  return {
    id: messageId,
    name: `#${channelName} - ${timestamp}`,
    metadata: {
      teamId,
      organisationId,
      channelId,
      messageId,
      type: 'message',
    } satisfies MessageMetadata,
    updatedAt: updatedAt ?? undefined,
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
    url: webUrl,
    contentHash: etag
  };
};
