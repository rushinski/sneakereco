import { z } from 'zod';

export const SignOutDtoSchema = z.object({
  accessToken: z.string().min(1),
});

export type SignOutDto = z.infer<typeof SignOutDtoSchema>;
