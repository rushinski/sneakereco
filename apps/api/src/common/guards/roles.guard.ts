import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { AuthenticatedUser, UserType } from '../../modules/auth/auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Checks user.userType against @Roles() after AuthGuard validates the JWT.
 * Platform admins are implicitly allowed on all store-admin routes.
 * Public routes are skipped.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<UserType[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    const user = request.user;

    // Platform admins can access store-admin routes (to manage tenant dashboards)
    if (user?.isSuperAdmin && requiredRoles.includes('store-admin')) {
      return true;
    }

    if (!user?.userType || !requiredRoles.includes(user.userType)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
