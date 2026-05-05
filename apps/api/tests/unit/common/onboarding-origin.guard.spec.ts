import { describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';

import { OnboardingOriginGuard } from '../../../src/common/guards/onboarding-origin.guard';

describe('OnboardingOriginGuard', () => {
  it('allows onboarding-only routes when the request origin is the platform', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    };
    const requestHostResolver = {
      resolveOrigin: jest.fn().mockResolvedValue({
        hostname: 'sneakereco.test',
        tenantId: null,
        surface: 'platform',
        hostKind: 'platform',
        canonicalHost: 'sneakereco.test',
        isCanonicalHost: true,
        redirectToHostname: null,
        status: 'active',
      }),
    };

    const guard = new OnboardingOriginGuard(reflector as never, requestHostResolver as never);

    await expect(
      guard.canActivate({
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              origin: 'https://sneakereco.test',
            },
          }),
        }),
      } as never),
    ).resolves.toBe(true);
  });

  it('allows onboarding-only routes when the request origin is the platform admin host', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    };
    const requestHostResolver = {
      resolveOrigin: jest.fn().mockResolvedValue({
        hostname: 'dashboard.sneakereco.test',
        tenantId: null,
        surface: 'platform-admin',
        hostKind: 'platform',
        canonicalHost: 'dashboard.sneakereco.test',
        isCanonicalHost: true,
        redirectToHostname: null,
        status: 'active',
      }),
    };

    const guard = new OnboardingOriginGuard(reflector as never, requestHostResolver as never);

    await expect(
      guard.canActivate({
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              origin: 'https://dashboard.sneakereco.test',
            },
          }),
        }),
      } as never),
    ).resolves.toBe(true);
  });

  it('rejects onboarding-only routes from non-platform origins', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    };
    const requestHostResolver = {
      resolveOrigin: jest.fn().mockResolvedValue({
        hostname: 'heatkings.test',
        tenantId: 'tnt_123',
        surface: 'customer',
        hostKind: 'custom',
        canonicalHost: 'heatkings.test',
        isCanonicalHost: true,
        redirectToHostname: null,
        status: 'active',
      }),
    };

    const guard = new OnboardingOriginGuard(reflector as never, requestHostResolver as never);

    await expect(
      guard.canActivate({
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              origin: 'https://heatkings.test',
            },
          }),
        }),
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
