// needs checked after auth
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { PLATFORM_ADMIN_KEY } from '../decorators/platform-admin.decorator';
import { OriginResolverService } from '../services/origin-resolver.service';
import type { AuthenticatedUser } from '../../modules/auth/auth.types';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly originResolver: OriginResolverService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPlatformAdmin = this.reflector.getAllAndOverride<boolean>(PLATFORM_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isPlatformAdmin) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    // 1. Origin must be the platform site or dashboard.
    const origin = request.headers.origin;
    if (!origin || !this.originResolver.isPlatformOrigin(origin)) {
      throw new ForbiddenException('Platform origin required');
    }

    // 2. Authenticated user must be a super admin.
    if (!request.user?.isSuperAdmin) {
      throw new ForbiddenException('Platform admin access required');
    }

    return true;
  }
}
