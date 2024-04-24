import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

export const startRecreateSubscriptionsForOrganisations = inngest.createFunction(
  {
    id: 'teams/start-recreate-subscriptions-for-organisations',
  },
  { event: 'teams/organisations.start.recreate.subscriptions' },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'recreate-subscriptions',
        organisations.map((organisation) => ({
          name: 'teams/organisation.recreate.subscriptions',
          data: {
            organisationId: organisation.id,
          },
        }))
      );
    }
  }
);
