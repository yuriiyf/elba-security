import { createInngestFunctionMock } from '@elba-security/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { syncTeams } from '@/inngest/functions/channels/sync-teams';
import type { MicrosoftTeam } from '@/connectors/microsoft/teams/teams';
import * as teamConnector from '@/connectors/microsoft/teams/teams';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';

const token = 'token';
const startSkipToken = 'start-skip-token';
const nextSkipToken = 'next-skip-token';
const encryptedToken = await encrypt(token);

const organisation = {
  id: '973b95c5-5dc2-44e8-8ed6-a4ff91a7cf8d',
  tenantId: 'tenantId',
  region: 'us',
  token: encryptedToken,
};

const setup = createInngestFunctionMock(syncTeams, 'teams/teams.sync.triggered');

const data = {
  organisationId: organisation.id,
  skipToken: startSkipToken,
};

const validTeams: MicrosoftTeam[] = [
  { id: 'team-id-1', visibility: 'public' },
  { id: 'team-id-2', visibility: 'public' },
  { id: 'team-id-3', visibility: 'private' },
];

const invalidTeams = [
  { id: 'team-id-2', visibility: 'public', status: 'private' },
  { id: 'team-id-1', visibility: 'public', status: 'private' },
];

describe('sync-teams', () => {
  test('should abort sync when organisation is not registered', async () => {
    const getTeams = vi.spyOn(teamConnector, 'getTeams').mockResolvedValue({
      nextSkipToken,
      validTeams,
      invalidTeams,
    });
    const [result, { step }] = setup(data);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(getTeams).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    await db.insert(organisationsTable).values(organisation);

    const getTeams = vi.spyOn(teamConnector, 'getTeams').mockResolvedValue({
      nextSkipToken,
      validTeams,
      invalidTeams,
    });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(getTeams).toBeCalledTimes(1);
    expect(getTeams).toBeCalledWith({
      skipToken: data.skipToken,
      token,
    });

    expect(step.waitForEvent).toBeCalledTimes(3);
    expect(step.waitForEvent).toBeCalledWith('wait-for-channels-complete-team-id-1', {
      event: 'teams/channels.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.teamId == 'team-id-1'`,
      timeout: '1d',
    });

    expect(step.waitForEvent).toBeCalledWith('wait-for-channels-complete-team-id-2', {
      event: 'teams/channels.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.teamId == 'team-id-2'`,
      timeout: '1d',
    });

    expect(step.waitForEvent).toBeCalledWith('wait-for-channels-complete-team-id-3', {
      event: 'teams/channels.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.teamId == 'team-id-3'`,
      timeout: '1d',
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('start-channels-sync', [
      {
        data: {
          teamId: 'team-id-1',
          organisationId: organisation.id,
        },
        name: 'teams/channels.sync.triggered',
      },
      {
        data: {
          teamId: 'team-id-2',
          organisationId: organisation.id,
        },
        name: 'teams/channels.sync.triggered',
      },
      {
        data: {
          teamId: 'team-id-3',
          organisationId: organisation.id,
        },
        name: 'teams/channels.sync.triggered',
      },
    ]);

    expect(step.sendEvent).toBeCalledWith('sync-next-teams-page', {
      name: 'teams/teams.sync.triggered',
      data: { ...data, skipToken: nextSkipToken },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    await db.insert(organisationsTable).values(organisation);

    const getTeams = vi.spyOn(teamConnector, 'getTeams').mockResolvedValue({
      nextSkipToken: null,
      validTeams,
      invalidTeams,
    });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(getTeams).toBeCalledTimes(1);
    expect(getTeams).toBeCalledWith({
      token,
      skipToken: data.skipToken,
    });

    expect(step.waitForEvent).toBeCalledTimes(3);
    expect(step.waitForEvent).toBeCalledWith('wait-for-channels-complete-team-id-1', {
      event: 'teams/channels.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.teamId == 'team-id-1'`,
      timeout: '1d',
    });

    expect(step.waitForEvent).toBeCalledWith('wait-for-channels-complete-team-id-2', {
      event: 'teams/channels.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.teamId == 'team-id-2'`,
      timeout: '1d',
    });

    expect(step.waitForEvent).toBeCalledWith('wait-for-channels-complete-team-id-3', {
      event: 'teams/channels.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.teamId == 'team-id-3'`,
      timeout: '1d',
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('start-channels-sync', [
      {
        data: {
          teamId: 'team-id-1',
          organisationId: organisation.id,
        },
        name: 'teams/channels.sync.triggered',
      },
      {
        data: {
          teamId: 'team-id-2',
          organisationId: organisation.id,
        },
        name: 'teams/channels.sync.triggered',
      },
      {
        data: {
          teamId: 'team-id-3',
          organisationId: organisation.id,
        },
        name: 'teams/channels.sync.triggered',
      },
    ]);
  });
});
