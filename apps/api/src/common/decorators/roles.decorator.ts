import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restricts access to users with at least one of the specified roles.
 *
 * When no @Roles() decorator is present, RolesGuard allows any authenticated
 * user through. When present, the user's role (from the JWT claims) must match
 * at least one of the listed roles.
 *
 * @example
 * ```ts
 * @Roles('admin', 'owner')
 * @Get('settings')
 * getSettings() { ... }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);