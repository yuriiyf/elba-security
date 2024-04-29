import { JWT, OAuth2Client } from 'google-auth-library';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env/server';
import { GOOGLE_SCOPES } from './constants';
import { GoogleUnauthorizedError } from './errors';

export const getGoogleServiceAccountClient = async (managerEmail: string, isAdmin = false) => {
  const client = new JWT({
    key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    email: env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    scopes: GOOGLE_SCOPES,
    subject: managerEmail,
  });

  if (isAdmin) {
    try {
      await client.authorize();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- error handling
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- error handling
      if (error?.status === 401) {
        logger.error('Admin does not have the required privileges', { managerEmail });
        throw new GoogleUnauthorizedError('Admin does not have the required privileges', {
          cause: error,
        });
      }
    }
  }

  return client;
};

export const getGoogleOAuthClient = () => {
  return new OAuth2Client({
    clientId: env.GOOGLE_AUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_AUTH_CLIENT_SECRET,
    redirectUri: env.GOOGLE_AUTH_REDIRECT_URI,
  });
};
