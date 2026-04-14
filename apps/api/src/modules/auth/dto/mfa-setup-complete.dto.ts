import { z } from 'zod';

export const MfaSetupCompleteDtoSchema = z.object({
  email:   z.string().email(),
  session: z.string().min(1),
  mfaCode: z.string().length(6),
});

export type MfaSetupCompleteDto = z.infer<typeof MfaSetupCompleteDtoSchema>;
