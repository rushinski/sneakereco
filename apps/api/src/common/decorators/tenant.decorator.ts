import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

import type { AuthenticatedUser } from '../../modules/auth/auth.types';

type RequestWithTenant = {
  user?: AuthenticatedUser;
  headers: Record<string, string | string[] | undefined>;
};

/**
 * Extracts the current tenant ID from the request.
 *
 * For authenticated routes: reads from the JWT claims on request.user.
 * For public routes: reads from the X-Tenant-ID header (set by the frontend
 * based on the domain the request is coming from).
 *
 * Returns undefined if neither is present — callers that require a tenant
 * should guard against this or use TenantGuard.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>();
    const tenantHeader = request.headers['x-tenant-id'];

    return request.user?.tenantId ?? (typeof tenantHeader === 'string' ? tenantHeader : tenantHeader?.[0]);
  },
);
