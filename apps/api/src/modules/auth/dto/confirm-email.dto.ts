import { z } from 'zod';

export const ConfirmEmailDtoSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export type ConfirmEmailDto = z.infer<typeof ConfirmEmailDtoSchema>;
