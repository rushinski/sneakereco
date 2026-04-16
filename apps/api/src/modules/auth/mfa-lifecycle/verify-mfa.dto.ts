import { z } from 'zod';

export const VerifyMfaDtoSchema = z.object({
  mfaCode: z.string().length(6),
  deviceName: z.string().optional(),
});

export type VerifyMfaDto = z.infer<typeof VerifyMfaDtoSchema>;
