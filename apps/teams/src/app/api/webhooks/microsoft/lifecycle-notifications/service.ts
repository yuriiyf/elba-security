import { inArray } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import type { MicrosoftLifecycleHandlerPayload } from '@/app/api/webhooks/microsoft/lifecycle-notifications/types';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

export const handleSubscriptionEvent = async (
  events: MicrosoftLifecycleHandlerPayload['value']
) => {
  if (!events.length) {
    return;
  }

  const reauthorizeEvents = events.filter(
    ({ lifecycleEvent }) => lifecycleEvent === 'reauthorizationRequired'
  );

  const tenantIds = reauthorizeEvents.map((tenant) => tenant.organisationId);

  const organisations = await db
    .select({
      organisationId: organisationsTable.id,
      tenantId: organisationsTable.tenantId,
    })
    .from(organisationsTable)
    .where(inArray(organisationsTable.tenantId, tenantIds));

  const subscriptionEvents = reauthorizeEvents.map((subscription) => {
    const currentOrganisation = organisations.find(
      (organisation) => organisation.tenantId === subscription.organisationId
    );
    if (currentOrganisation?.tenantId) {
      return { ...subscription, organisationId: currentOrganisation.organisationId };
    }
    return subscription;
  });

  await inngest.send(
    subscriptionEvents.map(({ subscriptionId, organisationId }) => ({
      name: 'teams/subscription.refresh.requested',
      data: {
        organisationId,
        subscriptionId,
      },
    }))
  );
};
