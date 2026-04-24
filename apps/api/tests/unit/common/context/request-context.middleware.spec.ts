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
