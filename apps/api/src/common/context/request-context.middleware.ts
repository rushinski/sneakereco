import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { OriginResolverService } from '../services/origin-resolver.service';
import { PoolResolverService } from '../../modules/auth/shared/pool-resolver/pool-resolver.service';
import type { PoolCredentials } from '../../modules/auth/shared/cognito/cognito.types';

import { RequestCtx, type RequestContext } from './request-context';
import {
  normalizeAppSurfaceHeader,
  resolveRequestSurface,
  type AppSurface,
} from './request-surface';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(
    private readonly originResolver: OriginResolverService,
    private readonly poolResolver: PoolResolverService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    void this.handle(req, res, next);
  }

  private async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transportHost =
        this.originResolver.normalizeHost(this.readHeaderValue(req.headers.host) ?? req.hostname) ??
        '';
      const rawOrigin = this.readHeaderValue(req.headers.origin);
      const originHost = this.originResolver.normalizeHost(rawOrigin);
      const originContext = rawOrigin
        ? await this.originResolver.classifyOrigin(rawOrigin)
        : { origin: 'unknown' as const, tenantId: null, tenantSlug: null };
      const resolvedHost = originHost && originContext.origin !== 'unknown' ? originHost : transportHost;
      const tenant = resolvedHost
        ? await this.originResolver.resolveTenantByHost(resolvedHost)
        : null;
      const resolution = resolveRequestSurface({
        appHost: resolvedHost,
        appSurface: normalizeAppSurfaceHeader(this.readHeaderValue(req.headers['x-app-surface'])),
        tenant: tenant
          ? {
              subdomain: tenant.subdomain,
              customDomain: tenant.customDomain,
              adminDomain: tenant.adminDomain,
            }
          : null,
        platformHosts: this.originResolver.getPlatformHosts(),
      });
      const pool = await this.resolvePool(resolution.surface, tenant?.tenantId ?? null);

      const ctx: RequestContext = {
        requestId: String(this.readHeaderValue(req.headers['x-request-id']) ?? ''),
        host: resolvedHost,
        hostType: resolution.hostType,
        surface: resolution.surface,
        canonicalHost: resolution.canonicalHost,
        isCanonicalHost: resolution.isCanonicalHost,
        origin: this.mapSurfaceToOrigin(resolution.surface),
        tenantId: tenant?.tenantId ?? null,
        tenantSlug: tenant?.tenantSlug ?? null,
        pool,
        user: null,
      };

      RequestCtx.run(ctx, () => next());
    } catch (error) {
      next(error);
    }
  }

  private async resolvePool(
    surface: AppSurface,
    tenantId: string | null,
  ): Promise<PoolCredentials | null> {
    if (surface === 'platform-admin' || surface === 'unknown' || !tenantId) {
      return null;
    }

    const role = surface === 'store-admin' ? 'admin' : 'customer';

    try {
      return await this.poolResolver.resolveTenantPool(tenantId, role);
    } catch {
      return null;
    }
  }

  private mapSurfaceToOrigin(surface: AppSurface): RequestContext['origin'] {
    if (surface === 'platform-admin') {
      return 'platform-admin';
    }
    if (surface === 'store-admin') {
      return 'store-admin';
    }
    return surface;
  }

  private readHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }
}
