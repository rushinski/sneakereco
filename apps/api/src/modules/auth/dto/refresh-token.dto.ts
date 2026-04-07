import { z } from 'zod';

export const RefreshTokenDtoSchema = z.object({
  refreshToken: z.string().min(1),
  clientType: z.enum(['customer', 'admin']).optional().default('customer'),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenDtoSchema>;
