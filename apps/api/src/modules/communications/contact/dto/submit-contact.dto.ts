import { z } from 'zod';

export const SubmitContactDtoSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  subject: z.string().trim().min(1),
  message: z.string().trim().min(10),
});

export type SubmitContactDto = z.infer<typeof SubmitContactDtoSchema>;
