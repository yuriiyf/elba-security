import { deleteDataProtectionObject } from '@/inngest/functions/data-protection/delete-data-protection-object';
import { refreshDataProtectionObject } from '@/inngest/functions/data-protection/refresh-data-protection-object';

export const dataProtectionFunctions = [deleteDataProtectionObject, refreshDataProtectionObject];
