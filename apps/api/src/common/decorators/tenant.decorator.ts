import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../modules/auth/auth.types';

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
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    return (
      request.user?.tenantId ??
      (request.headers['x-tenant-id'] as string | undefined)
    );
  },
);
