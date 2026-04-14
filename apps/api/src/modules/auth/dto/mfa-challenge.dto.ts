import { z } from 'zod';

export const MfaChallengeDtoSchema = z.object({
  email: z.string().email(),
  session: z.string().min(1),
  mfaCode: z.string().length(6),
  clientType: z.enum(['customer', 'admin']).optional().default('customer'),
});

export type MfaChallengeDto = z.infer<typeof MfaChallengeDtoSchema>;
