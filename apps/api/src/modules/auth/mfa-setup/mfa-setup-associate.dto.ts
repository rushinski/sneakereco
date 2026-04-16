import { z } from 'zod';

export const MfaSetupAssociateDtoSchema = z.object({
  session: z.string().min(1),
});

export type MfaSetupAssociateDto = z.infer<typeof MfaSetupAssociateDtoSchema>;
