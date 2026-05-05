import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ONBOARDING_ONLY_KEY } from '../decorators/onboarding-only.decorator';
import { RequestHostResolverService } from '../routing/request-host-resolver.service';

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class OnboardingOriginGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly requestHostResolver: RequestHostResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const onboardingOnly = this.reflector.getAllAndOverride<boolean>(ONBOARDING_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!onboardingOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const rawOrigin = Array.isArray(request.headers.origin)
      ? request.headers.origin[0]
      : request.headers.origin;
    const origin = await this.requestHostResolver.resolveOrigin(rawOrigin);

    if (
      !origin ||
      origin.tenantId !== null ||
      (origin.surface !== 'platform' && origin.surface !== 'platform-admin')
    ) {
      throw new ForbiddenException('Platform origin required');
    }

    return true;
  }
}
