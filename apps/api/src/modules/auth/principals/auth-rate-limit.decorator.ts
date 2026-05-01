import { SetMetadata } from '@nestjs/common';

export const AUTH_RATE_LIMIT_PROFILE = 'auth_rate_limit_profile';

export function AuthRateLimit(profile: string) {
  return SetMetadata(AUTH_RATE_LIMIT_PROFILE, profile);
}