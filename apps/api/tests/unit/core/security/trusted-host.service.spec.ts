import { TrustedHostService } from '@/core/security/trusted-host.service';

function makeService() {
  const domainConfig = {
    baseDomain: 'sneakereco.com',
    apiBaseUrl: 'https://api.sneakereco.com',
    platformUrl: 'https://sneakereco.com',
    platformDashboardUrl: 'https://dashboard.sneakereco.com',
    staticAllowedOrigins: [],
  };
  return new TrustedHostService(domainConfig as any);
}

describe('TrustedHostService', () => {
  let service: TrustedHostService;

  beforeEach(() => {
    service = makeService();
  });

  it('identifies platform dashboard host', () => {
    expect(service.classify('dashboard.sneakereco.com')).toEqual({
      type: 'platform',
      tenantSlug: null,
      customDomain: false,
    });
  });

  it('identifies tenant subdomain', () => {
    expect(service.classify('kicks.sneakereco.com')).toEqual({
      type: 'tenant-storefront',
      tenantSlug: 'kicks',
      customDomain: false,
    });
  });

  it('identifies API host as internal', () => {
    expect(service.classify('api.sneakereco.com')).toEqual({
      type: 'api',
      tenantSlug: null,
      customDomain: false,
    });
  });

  it('returns unknown for unrecognized host without custom domain lookup', () => {
    expect(service.classify('evil.example.com')).toEqual({
      type: 'unknown',
      tenantSlug: null,
      customDomain: true,
    });
  });

  it('marks a host as possible custom domain for external lookup', () => {
    const result = service.classify('kicks.mystore.com');
    expect(result.type).toBe('unknown');
    expect(result.customDomain).toBe(true);
  });

  it('strips port from host before classifying', () => {
    expect(service.classify('kicks.sneakereco.com:3000')).toEqual({
      type: 'tenant-storefront',
      tenantSlug: 'kicks',
      customDomain: false,
    });
  });

  it('marks reserved subdomain www as unknown', () => {
    expect(service.classify('www.sneakereco.com').type).toBe('unknown');
  });
});
