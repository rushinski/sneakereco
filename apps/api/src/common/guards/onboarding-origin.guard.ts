import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ONBOARDING_ONLY_KEY } from '../decorators/onboarding-only.decorator';
import { RequestCtx } from '../context/request-context';

@Injectable()
export class OnboardingOriginGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const onboardingOnly = this.reflector.getAllAndOverride<boolean>(ONBOARDING_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!onboardingOnly) return true;

    const ctx = RequestCtx.get();

    if (ctx?.origin !== 'platform') {
      throw new ForbiddenException('Platform origin required');
    }

    return true;
  }
}
