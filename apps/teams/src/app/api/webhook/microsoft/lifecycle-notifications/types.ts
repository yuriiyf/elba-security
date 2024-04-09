import type { z } from 'zod';
import type { lifecycleEventSchema } from '@/app/api/webhook/microsoft/lifecycle-notifications/route';

export type MicrosoftSubscriptionEvent = z.infer<typeof lifecycleEventSchema>;
