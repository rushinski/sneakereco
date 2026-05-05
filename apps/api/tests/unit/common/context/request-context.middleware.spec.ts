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
    const requestHostResolver = {
      resolveHost: jest.fn().mockResolvedValue({
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
    const poolResolver = {
      resolveTenantPool: jest.fn(),
    };

    const middleware = new RequestContextMiddleware(
      requestHostResolver as never,
      poolResolver as never,
    );
    let capturedSurface: string | undefined;

    await (middleware as any).handle(
      {
        headers: {
          host: 'api.sneakereco.test',
          origin: 'https://dashboard.sneakereco.test',
          'x-app-surface': 'platform-admin',
        },
        hostname: 'api.sneakereco.test',
        method: 'GET',
        url: '/v1/auth/refresh',
      },
      () => {
        capturedSurface = RequestCtx.get()?.surface;
      },
    );

    expect(capturedSurface).toBe('platform-admin');
    expect(poolResolver.resolveTenantPool).not.toHaveBeenCalled();
  });

  it('marks requests unknown when host is not found', async () => {
    const requestHostResolver = {
      resolveHost: jest.fn().mockResolvedValue(null),
    };
    const poolResolver = {
      resolveTenantPool: jest.fn(),
    };

    const middleware = new RequestContextMiddleware(
      requestHostResolver as never,
      poolResolver as never,
    );
    let captured = RequestCtx.get();

    await (middleware as any).handle(
      {
        headers: {
          host: 'unknown.test',
        },
        hostname: 'unknown.test',
      },
      () => {
        captured = RequestCtx.get();
      },
    );

    expect(captured).toMatchObject({
      surface: 'unknown',
      tenantId: null,
      canonicalHost: null,
      isCanonicalHost: false,
    });
    expect(poolResolver.resolveTenantPool).not.toHaveBeenCalled();
  });

  it('derives surface and tenant from resolved host row', async () => {
    const requestHostResolver = {
      resolveHost: jest.fn().mockResolvedValue({
        hostname: 'admin.heatkings.test',
        tenantId: 'tnt_heatkings',
        surface: 'store-admin',
        hostKind: 'admin-custom',
        canonicalHost: 'admin.heatkings.test',
        isCanonicalHost: true,
        redirectToHostname: null,
        status: 'active',
      }),
    };
    const poolResolver = {
      resolveTenantPool: jest.fn().mockResolvedValue({
        userPoolId: 'pool_platform',
        clientId: 'client_store_admin',
      }),
    };

    const middleware = new RequestContextMiddleware(
      requestHostResolver as never,
      poolResolver as never,
    );
    let captured = RequestCtx.get();

    await (middleware as any).handle(
      {
        headers: {
          host: 'admin.heatkings.test',
        },
        hostname: 'admin.heatkings.test',
      },
      () => {
        captured = RequestCtx.get();
      },
    );

    expect(captured).toMatchObject({
      host: 'admin.heatkings.test',
      surface: 'store-admin',
      tenantId: 'tnt_heatkings',
      canonicalHost: 'admin.heatkings.test',
      isCanonicalHost: true,
    });
    expect(poolResolver.resolveTenantPool).toHaveBeenCalledWith('tnt_heatkings', 'admin');
  });
});
