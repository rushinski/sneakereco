import { TenantResolutionService } from '@/modules/tenants/tenant-domain/tenant-resolution.service';
import { TrustedHostService } from '@/core/security/trusted-host.service';

const mockDomainRepo = {
  findBySubdomain: jest.fn(),
  findByCustomDomain: jest.fn(),
  findByOriginHost: jest.fn(),
};

const domainConfig = {
  baseDomain: 'sneakereco.com',
  platformDashboardUrl: 'https://dashboard.sneakereco.com',
  apiBaseUrl: 'https://api.sneakereco.com',
  platformUrl: 'https://sneakereco.com',
  staticAllowedOrigins: [],
};

const trustedHostService = new TrustedHostService(domainConfig as any);

describe('TenantResolutionService', () => {
  let service: TenantResolutionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TenantResolutionService(mockDomainRepo as any, trustedHostService);
  });

  it('resolves tenant from subdomain', async () => {
    mockDomainRepo.findBySubdomain.mockResolvedValue({ tenantId: 'tnt_abc', subdomain: 'kicks' });
    const result = await service.resolveFromHost('kicks.sneakereco.com');
    expect(result).toEqual({ tenantId: 'tnt_abc', source: 'subdomain', slug: 'kicks' });
  });

  it('resolves tenant from custom domain', async () => {
    mockDomainRepo.findByCustomDomain.mockResolvedValue({ tenantId: 'tnt_xyz', subdomain: 'kicks' });
    const result = await service.resolveFromHost('kicks.mystore.com');
    expect(result).toEqual({ tenantId: 'tnt_xyz', source: 'custom-domain', slug: 'kicks' });
  });

  it('returns null for unknown host not in tenant_domain_configs', async () => {
    mockDomainRepo.findByCustomDomain.mockResolvedValue(null);
    const result = await service.resolveFromHost('evil.example.com');
    expect(result).toBeNull();
  });

  it('returns platform context for platform dashboard host', async () => {
    const result = await service.resolveFromHost('dashboard.sneakereco.com');
    expect(result).toEqual({ tenantId: null, source: 'platform', slug: null });
  });

  it('returns null if subdomain not registered', async () => {
    mockDomainRepo.findBySubdomain.mockResolvedValue(null);
    const result = await service.resolveFromHost('unknown.sneakereco.com');
    expect(result).toBeNull();
  });
});
