import { z } from 'zod';

export const PlatformAdminSignInDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type PlatformAdminSignInDto = z.infer<typeof PlatformAdminSignInDtoSchema>;
