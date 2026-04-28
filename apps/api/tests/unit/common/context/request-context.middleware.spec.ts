import { describe, expect, it, jest } from '@jest/globals';

import { RequestCtx } from '../../../../src/common/context/request-context';
import { RequestContextMiddleware } from '../../../../src/common/context/request-context.middleware';
import { resolveRequestSurface } from '../../../../src/common/context/request-surface';

describe('request surface resolution', () => {
  it('treats a managed fallback admin request as store-admin when the header says store-admin', () => {
    expect(
      resolveRequestSurface({
        appHost: 'heatkings.sneakereco.com',
        appSurface: 'store-admin',
        tenant: { subdomain: 'heatkings', customDomain: null, adminDomain: null },
        platformHosts: { platform: 'sneakereco.com', dashboard: 'dashboard.sneakereco.com' },
      }),
    ).toMatchObject({
      hostType: 'store-public',
      surface: 'store-admin',
      canonicalHost: 'heatkings.sneakereco.com',
      isCanonicalHost: true,
    });
  });
});

describe('RequestContextMiddleware', () => {
  it('classifies dashboard-origin API requests as platform-admin', async () => {
    const originResolver = {
      normalizeHost: jest.fn((value: string | undefined | null) => {
        if (!value) {
          return null;
        }

        return new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase();
      }),
      classifyOrigin: jest.fn().mockResolvedValue({
        origin: 'platform',
        tenantId: null,
        tenantSlug: null,
      }),
      resolveTenantByHost: jest.fn().mockResolvedValue(null),
      getPlatformHosts: jest
        .fn()
        .mockReturnValue({ platform: 'sneakereco.test', dashboard: 'dashboard.sneakereco.test' }),
    };
    const poolResolver = {
      resolveTenantPool: jest.fn(),
    };

    const middleware = new RequestContextMiddleware(originResolver as never, poolResolver as never);
    let capturedSurface: string | undefined;

    await (middleware as any).handle(
      {
        headers: {
          host: 'api.sneakereco.test',
          origin: 'https://dashboard.sneakereco.test',
          'x-app-surface': 'platform-admin',
        },
        hostname: 'api.sneakereco.test',
      },
      {} as never,
      () => {
        capturedSurface = RequestCtx.get()?.surface;
      },
    );

    expect(capturedSurface).toBe('platform-admin');
    expect(poolResolver.resolveTenantPool).not.toHaveBeenCalled();
  });
});
