import { SetMetadata } from '@nestjs/common';

export const PLATFORM_ADMIN_KEY = 'platformAdmin';

/**
 * Mark a route as requiring platform admin access.
 * Consumed by PlatformAdminGuard, which verifies:
 *   1. The request origin is the platform or dashboard origin.
 *   2. The authenticated user has isSuperAdmin = true in their JWT.
 */
export const PlatformAdmin = () => SetMetadata(PLATFORM_ADMIN_KEY, true);
