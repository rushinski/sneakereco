import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { OriginResolverService } from '../services/origin-resolver.service';
import { PoolResolverService } from '../../modules/auth/shared/pool-resolver/pool-resolver.service';
import type { PoolCredentials } from '../../modules/auth/shared/cognito/cognito.types';
import type { OriginContext } from '../services/origin-resolver.service';
import { RequestCtx, type RequestContext } from './request-context';
import type { UserType } from '../../modules/auth/auth.types';

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
      const originCtx = await this.originResolver.classifyOrigin(req.headers.origin);
      const pool = await this.resolvePool(originCtx);

      const ctx: RequestContext = {
        requestId: req.headers['x-request-id'] as string ?? '',
        origin: this.mapOriginToUserType(originCtx.origin),
        tenantId: originCtx.tenantId,
        tenantSlug: originCtx.tenantSlug,
        pool,
        user: null,
      };

      RequestCtx.run(ctx, () => next());
    } catch (error) {
      next(error);
    }
  }

  private async resolvePool(originCtx: OriginContext): Promise<PoolCredentials | null> {
    if (originCtx.origin === 'platform' || originCtx.origin === 'unknown' || !originCtx.tenantId) {
      return null;
    }

    const role = originCtx.origin === 'tenant-admin' ? 'admin' : 'customer';

    try {
      return await this.poolResolver.resolveTenantPool(originCtx.tenantId, role);
    } catch {
      return null;
    }
  }

  private mapOriginToUserType(origin: OriginContext['origin']): UserType | 'unknown' {
    if (origin === 'platform') return 'platform-admin';
    if (origin === 'tenant-admin') return 'store-admin';
    return origin;
  }
}
