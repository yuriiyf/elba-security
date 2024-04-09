import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { refreshDataProtectionObject } from '@/app/api/webhook/elba/data-protection/refresh-object/service';
import { env } from '@/env';

export const preferredRegion = env.VERCEL_PREFERRED_REGION;
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
  const data: unknown = await request.json();

  // eslint-disable-next-line -- metadata type is any
  const { organisationId, metadata } = parseWebhookEventData(
    'data_protection.refresh_object_requested',
    data
  );

  await refreshDataProtectionObject({
    organisationId,
    metadata, // eslint-disable-line -- metadata type is any,
  });

  return new NextResponse();
};
