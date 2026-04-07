import { z } from 'zod';

export const ResendConfirmationDtoSchema = z.object({
  email: z.string().email(),
});

export type ResendConfirmationDto = z.infer<typeof ResendConfirmationDtoSchema>;
