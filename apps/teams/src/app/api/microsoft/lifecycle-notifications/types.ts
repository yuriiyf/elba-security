import type { z } from 'zod';
import type { lifecycleEventSchema } from '@/app/api/microsoft/lifecycle-notifications/schema';

export type MicrosoftSubscriptionEvent = z.infer<typeof lifecycleEventSchema>;
