import { z } from 'zod';

export const SignInDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  clientType: z.enum(['customer', 'admin']).optional().default('customer'),
});

export type SignInDto = z.infer<typeof SignInDtoSchema>;
