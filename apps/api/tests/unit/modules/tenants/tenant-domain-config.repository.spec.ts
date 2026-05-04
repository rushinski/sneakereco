import { TenantDomainConfigRepository } from '../../../../src/modules/tenants/tenant-domain/domain-config.repository';

const baseRow = {
  id: 'tdc_1',
  tenantId: 'tnt_1',
  subdomain: 'kicks',
  dnsVerificationToken: null,
  cloudflareZoneId: null,
  storefrontCustomDomain: 'kicks.com',
  storefrontReadinessState: 'ready' as const,
  storefrontVerifiedAt: null,
  storefrontReadyAt: null,
  storefrontFailureReason: null,
  adminDomain: null,
  adminReadinessState: 'not_configured' as const,
  adminVerifiedAt: null,
  adminReadyAt: null,
  adminFailureReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function selectChain(rows: unknown[]) {
  const limit = jest.fn().mockResolvedValue(rows);
  const where = jest.fn().mockReturnValue({ limit });
  const from = jest.fn().mockReturnValue({ where });
  return { db: { select: jest.fn().mockReturnValue({ from }) } };
}

function insertChain(row: unknown) {
  const returning = jest.fn().mockResolvedValue([row]);
  const values = jest.fn().mockReturnValue({ returning });
  return { db: { insert: jest.fn().mockReturnValue({ values }) } };
}

describe('TenantDomainConfigRepository', () => {
  it('create inserts and returns record', async () => {
    const repo = new TenantDomainConfigRepository(insertChain(baseRow) as any);
    const result = await repo.create({
      tenantId: 'tnt_1',
      subdomain: 'kicks',
      storefrontCustomDomain: 'kicks.com',
      storefrontReadinessState: 'ready',
      adminReadinessState: 'not_configured',
    });
    expect(result.subdomain).toBe('kicks');
    expect(result.storefrontCustomDomain).toBe('kicks.com');
  });

  it('findBySubdomain returns null when not found', async () => {
    const repo = new TenantDomainConfigRepository(selectChain([]) as any);
    expect(await repo.findBySubdomain('nope')).toBeNull();
  });

  it('findByCustomDomain returns record for matching host', async () => {
    const repo = new TenantDomainConfigRepository(selectChain([baseRow]) as any);
    const result = await repo.findByCustomDomain('kicks.com');
    expect(result?.storefrontCustomDomain).toBe('kicks.com');
  });

  it('findByOriginHost returns null when not found', async () => {
    const repo = new TenantDomainConfigRepository(selectChain([]) as any);
    expect(await repo.findByOriginHost('unknown.com')).toBeNull();
  });
});


