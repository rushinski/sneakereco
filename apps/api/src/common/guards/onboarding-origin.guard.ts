import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ONBOARDING_ONLY_KEY } from '../decorators/onboarding-only.decorator';
import { OriginResolverService } from '../middleware/origin-resolver.service';

@Injectable()
export class OnboardingOriginGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly originResolver: OriginResolverService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const onboardingOnly = this.reflector.getAllAndOverride<boolean>(ONBOARDING_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!onboardingOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin;

    if (!origin || !this.originResolver.isPlatformOrigin(origin)) {
      throw new ForbiddenException('Platform origin required');
    }

    return true;
  }
}
