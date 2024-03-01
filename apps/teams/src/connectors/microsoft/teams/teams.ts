import { z } from 'zod';
import { env } from '@/env';
import { MicrosoftError } from '../commons/error';
import {
  getNextSkipTokenFromNextLink,
  type MicrosoftPaginatedResponse,
} from '../commons/pagination';

const teamSchema = z.object({
  id: z.string(),
  visibility: z.string(),
});

export type MicrosoftTeam = z.infer<typeof teamSchema>;

export type GetTeamsParams = {
  token: string;
  skipToken: string | null;
};

export const getTeams = async ({ token, skipToken }: GetTeamsParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/teams`);
  url.searchParams.append('$top', String(env.TEAMS_SYNC_BATCH_SIZE));
  url.searchParams.append('$select', 'id,visibility');

  if (skipToken) {
    url.searchParams.append('$skiptoken', skipToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve teams', { response });
  }

  const data = (await response.json()) as MicrosoftPaginatedResponse<unknown>;

  const teams = data.value.reduce<MicrosoftTeam[]>((acum, team) => {
    const result = teamSchema.safeParse(team);
    return result.success ? [...acum, result.data] : acum;
  }, []);

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { nextSkipToken, teams };
};
