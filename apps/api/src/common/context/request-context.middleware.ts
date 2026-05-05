import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

import { RequestHostResolverService } from '../routing/request-host-resolver.service';
import { PoolResolverService } from '../../modules/auth/shared/pool-resolver/pool-resolver.service';
import type { PoolCredentials } from '../../modules/auth/shared/cognito/cognito.types';

import { RequestCtx, type RequestContext } from './request-context';
import type { AppSurface } from './request-surface';

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  hostname?: string;
};

type Next = (error?: unknown) => void;

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(
    private readonly requestHostResolver: RequestHostResolverService,
    private readonly poolResolver: PoolResolverService,
  ) {}

  use(req: RequestLike, _res: unknown, next: Next): void {
    void this.handle(req, next);
  }

  private async handle(req: RequestLike, next: Next): Promise<void> {
    try {
      const resolvedHost = await this.requestHostResolver.resolveHost(
        this.readHeaderValue(req.headers.host) ?? req.hostname,
      );
      const surface = this.mapResolvedSurface(resolvedHost?.surface);
      const tenantId = resolvedHost?.tenantId ?? null;
      const pool = await this.resolvePool(surface, tenantId);

      const ctx: RequestContext = {
        requestId: String(this.readHeaderValue(req.headers['x-request-id']) ?? ''),
        host: resolvedHost?.hostname ?? '',
        hostType: this.mapHostType(surface),
        surface,
        canonicalHost: resolvedHost?.canonicalHost ?? null,
        isCanonicalHost: resolvedHost?.isCanonicalHost ?? false,
        origin: this.mapSurfaceToOrigin(surface),
        tenantId,
        tenantSlug: null,
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

  private mapResolvedSurface(surface: 'platform' | AppSurface | undefined): AppSurface {
    if (surface === 'platform') {
      return 'platform-admin';
    }

    return surface ?? 'unknown';
  }

  private mapHostType(surface: AppSurface): RequestContext['hostType'] {
    if (surface === 'platform-admin') {
      return 'platform';
    }
    if (surface === 'store-admin') {
      return 'store-admin-host';
    }
    if (surface === 'customer') {
      return 'store-public';
    }

    return 'unknown';
  }

  private readHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }
}
