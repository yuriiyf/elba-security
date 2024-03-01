/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import type { MicrosoftTeam } from '@/connectors/microsoft/teams/teams';
import { getTeams } from '@/connectors/microsoft/teams/teams';
import { server } from '../../../../vitest/setup-msw-handlers';
import { MicrosoftError } from '../commons/error';

const validToken = 'token-1234';
const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';

const teams: MicrosoftTeam[] = [
  { id: '231-22414-34214536', visibility: 'public' },
  { id: '111-42414-34214888', visibility: 'private' },
  { id: '114-46414-34214888', visibility: 'public' },
  { id: '114-46414-12214888', visibility: 'public' },
];

describe('getTeams', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.MICROSOFT_API_URL}/teams`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }

        const url = new URL(request.url);

        const select = url.searchParams.get('$select');
        const top = url.searchParams.get('$top');
        const skipToken = url.searchParams.get('$skiptoken');

        const selectedKeys = select?.split(',') || ([] as unknown as (keyof MicrosoftTeam)[]);
        const formatedTeams = teams.map((user) =>
          selectedKeys.reduce<Partial<MicrosoftTeam>>((acc, key: keyof MicrosoftTeam) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- convenience
            acc[key] = user[key];
            return acc;
          }, {})
        );

        const nextPageUrl = new URL(url);
        nextPageUrl.searchParams.set('$skiptoken', nextSkipToken);

        return Response.json({
          '@odata.nextLink':
            skipToken === endSkipToken ? null : decodeURIComponent(nextPageUrl.toString()),
          value: formatedTeams.slice(0, top ? Number(top) : 0),
        });
      })
    );
  });

  test('should return teams and nextSkipToken when the token is valid and their is another page', async () => {
    await expect(getTeams({ token: validToken, skipToken: startSkipToken })).resolves.toStrictEqual(
      {
        nextSkipToken,
        teams,
      }
    );
  });

  test('should return teams and no nextSkipToken when the token is valid and their is no other page', async () => {
    await expect(getTeams({ token: validToken, skipToken: endSkipToken })).resolves.toStrictEqual({
      teams,
      nextSkipToken: null,
    });
  });

  test('should throws when the token is invalid', async () => {
    await expect(
      getTeams({ token: 'invalid-token', skipToken: endSkipToken })
    ).rejects.toBeInstanceOf(MicrosoftError);
  });
});
