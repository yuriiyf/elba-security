import { env } from '@/env';
import { MicrosoftError } from '../commons/error';
import {
  getNextSkipTokenFromNextLink,
  type MicrosoftPaginatedResponse,
} from '../commons/pagination';
import { z } from 'zod';
import { MicrosoftTeam } from '@/connectors/microsoft/teams/teams';

export type GetMessagesParams = {
  token: string;
  teamId: string;
  channelId: string;
  skipToken?: string | null;
  messageId: string;
};

const repliesSchema = z.object({
  id: z.string(),
  webUrl: z.string().url(),
  subject: z.string(),
  body: z.object({
    content: z.string(),
  }),
  from: z.object({
    user: z.object({
      id: z.string(),
    }),
  }),
});

export type MicrosoftReply = z.infer<typeof repliesSchema>;

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
    throw new MicrosoftError('Could not retrieve messages', { response });
  }

  const data = (await response.json()) as MicrosoftPaginatedResponse<unknown>;

  const replies = data.value.reduce((acum: MicrosoftTeam[], team) => {
    const result = repliesSchema.safeParse(team);
    return result.success ? [...acum, result.data] : acum;
  }, []) as MicrosoftTeam[];

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { nextSkipToken, replies };
};
