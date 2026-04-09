import { z } from 'zod';
import { tenantOnboardingRequestStatusValues } from '@sneakereco/db';

export const ListRequestsDtoSchema = z.object({
  status: z.enum(tenantOnboardingRequestStatusValues).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListRequestsDto = z.infer<typeof ListRequestsDtoSchema>;
