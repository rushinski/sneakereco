import { TenantBusinessProfileRepository } from '../../../../src/modules/tenants/tenant-business-profile/business-profile.repository';

const baseRow = {
  id: 'tbp_1',
  tenantId: 'tnt_1',
  businessName: 'Kicks HQ',
  contactName: null,
  contactEmail: 'contact@kicks.com',
  contactPhone: null,
  instagramHandle: '@kicks',
  logoAssetId: null,
  supportEmail: null,
  supportPhone: null,
  locationSummary: null,
  footerLinkSet: null,
  socialLinks: null,
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

describe('TenantBusinessProfileRepository', () => {
  it('create inserts and returns record', async () => {
    const repo = new TenantBusinessProfileRepository(insertChain(baseRow) as any);
    const result = await repo.create({
      tenantId: 'tnt_1',
      businessName: 'Kicks HQ',
      contactEmail: 'contact@kicks.com',
      instagramHandle: '@kicks',
    });
    expect(result.tenantId).toBe('tnt_1');
    expect(result.businessName).toBe('Kicks HQ');
    expect(result.instagramHandle).toBe('@kicks');
  });

  it('findByTenantId returns null when not found', async () => {
    const repo = new TenantBusinessProfileRepository(selectChain([]) as any);
    expect(await repo.findByTenantId('nope')).toBeNull();
  });

  it('findByTenantId returns mapped record', async () => {
    const repo = new TenantBusinessProfileRepository(selectChain([baseRow]) as any);
    const result = await repo.findByTenantId('tnt_1');
    expect(result?.contactEmail).toBe('contact@kicks.com');
  });
});


