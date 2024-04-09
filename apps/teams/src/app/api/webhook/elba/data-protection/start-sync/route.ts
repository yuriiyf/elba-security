import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { startDataProtectionSync } from '@/app/api/webhook/elba/data-protection/start-sync/service';
import { env } from '@/env';

export const preferredRegion = env.VERCEL_PREFERRED_REGION;
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
  const data: unknown = await request.json();

  const { organisationId } = parseWebhookEventData('data_protection.start_sync_requested', data);

  await startDataProtectionSync(organisationId);

  return new NextResponse();
};
