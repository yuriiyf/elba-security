import { env } from '@/env';
import { messageSchema } from '@/connectors/microsoft/schemes';
import type { MicrosoftMessage } from '@/connectors/microsoft/types';
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
  messageId: string;
};

export const getReplies = async ({
  token,
  teamId,
  skipToken,
  channelId,
  messageId,
}: GetMessagesParams) => {
  const url = new URL(
    `${env.MICROSOFT_API_URL}/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`
  );
  url.searchParams.append('$top', String(env.REPLIES_SYNC_BATCH_SIZE));

  if (skipToken) {
    url.searchParams.append('$skiptoken', skipToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve replies', { response });
  }

  const data = (await response.json()) as MicrosoftPaginatedResponse<object>;

  const replies = data.value.reduce((acc: MicrosoftMessage[], reply) => {
    const result = messageSchema.safeParse({ ...reply, type: 'reply' });
    return result.success ? [...acc, result.data] : acc;
  }, []) as MicrosoftMessage[];

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { nextSkipToken, replies };
};
