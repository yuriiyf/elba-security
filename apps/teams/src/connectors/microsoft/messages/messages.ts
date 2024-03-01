import { z } from 'zod';
import { env } from '@/env';
import { MicrosoftError } from '../commons/error';
import {
  getNextSkipTokenFromNextLink,
  type MicrosoftPaginatedResponse,
} from '../commons/pagination';

export type GetMessagesParams = {
  token: string;
  teamId: string;
  channelId: string;
  skipToken?: string | null;
};

const messagesSchema = z.object({
  id: z.string(),
  webUrl: z.string().url(),
  etag: z.string(),
  from: z.object({
    user: z.object({
      id: z.string(),
    }),
  }),
  lastEditedDateTime: z.string().nullable(),
  createdDateTime: z.string(),
  messageType: z.enum([
    'typing',
    'message',
    'chatEvent',
    'unknownFutureValue',
    'systemEventMessage',
  ]),
});

export type MicrosoftMessage = z.infer<typeof messagesSchema>;

export const getMessages = async ({ token, teamId, skipToken, channelId }: GetMessagesParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/teams/${teamId}/channels/${channelId}/messages`);
  url.searchParams.append('$top', String(env.MESSAGES_SYNC_BATCH_SIZE));

  if (skipToken) {
    url.searchParams.append('$skiptoken', skipToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'include-unknown-enum-members',
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve messages', { response });
  }

  const data = (await response.json()) as MicrosoftPaginatedResponse<unknown>;

  const validMessages: MicrosoftMessage[] = [];
  const invalidMessages: unknown[] = [];

  for (const message of data.value) {
    const result = messagesSchema.safeParse(message);
    if (result.success) {
      if (result.data.messageType === 'message') {
        validMessages.push(result.data);
      }
    } else {
      invalidMessages.push(message);
    }
  }

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { nextSkipToken, invalidMessages, validMessages };
};
