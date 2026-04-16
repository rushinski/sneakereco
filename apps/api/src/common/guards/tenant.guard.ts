import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ModuleRef, ContextIdFactory, Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TenantContextService } from '../database/tenant-context.service';
import type { AuthenticatedUser } from '../../modules/auth/auth.types';

/**
 * Runs after AuthGuard. Reads the validated AuthenticatedUser from
 * request.user (populated by the JWT strategy) and calls
 * TenantContextService.setContext() so every downstream repository can
 * call getContext() without needing tenant info passed as parameters.
 *
 * Uses ContextIdFactory so the REQUEST-scoped TenantContextService instance
 * resolved here is the same one injected into repositories for this request.
 *
 * Public routes are skipped — request.user is not set on those.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    if (!request.user) return true;

    const { tenantId, cognitoSub, role, isSuperAdmin } = request.user;

    // Super admins don't have a tenant_id JWT claim — fall back to the
    // X-Tenant-ID header so they can access any tenant's admin routes.
    const effectiveTenantId =
      tenantId ?? (isSuperAdmin ? (request.headers['x-tenant-id'] as string | undefined) : undefined);

    if (!isSuperAdmin && !role) {
      throw new UnauthorizedException('User has no resolved role');
    }

    const effectiveRole = role ?? 'admin';

    // Resolve the REQUEST-scoped TenantContextService bound to this HTTP
    // request so the same instance is used by all downstream services.
    const contextId = ContextIdFactory.getByRequest(request);
    const tenantContextService = await this.moduleRef.resolve(
      TenantContextService,
      contextId,
      { strict: false },
    );

    tenantContextService.setContext(effectiveTenantId, cognitoSub, effectiveRole);

    return true;
  }
}
