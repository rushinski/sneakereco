import { z } from 'zod';

export const DisableMfaDtoSchema = z.object({
  mfaCode: z.string().length(6),
});

export type DisableMfaDto = z.infer<typeof DisableMfaDtoSchema>;
