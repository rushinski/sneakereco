import { z } from 'zod';

export const MfaChallengeDtoSchema = z.object({
  email: z.string().email(),
  session: z.string().min(1),
  mfaCode: z.string().length(6),
});

export type MfaChallengeDto = z.infer<typeof MfaChallengeDtoSchema>;
