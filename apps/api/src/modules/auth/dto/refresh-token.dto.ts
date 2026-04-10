import { z } from 'zod';

export const RefreshTokenDtoSchema = z.object({
  // Optional — for same-site subdomains the refresh token arrives via httpOnly cookie.
  // For cross-site custom-domain frontends it must be sent in the request body instead.
  refreshToken: z.string().min(1).optional(),
  clientType: z.enum(['customer', 'admin']).optional().default('customer'),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenDtoSchema>;
