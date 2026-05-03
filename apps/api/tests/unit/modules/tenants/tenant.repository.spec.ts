import { TenantRepository } from '../../../../src/modules/tenants/tenant-lifecycle/tenant.repository';

const baseRow = {
  id: 'tnt_1',
  name: 'Kicks HQ',
  slug: 'kickshq',
  email: 'owner@kickshq.com',
  status: 'provisioning' as const,
  provisioningFailedAt: null,
  provisioningFailureReason: null,
  setupCompletedAt: null,
  launchedAt: null,
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

function updateReturningChain(row: unknown) {
  const returning = jest.fn().mockResolvedValue([row]);
  const where = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where });
  return { db: { update: jest.fn().mockReturnValue({ set }) } };
}

describe('TenantRepository', () => {
  it('create inserts and returns record', async () => {
    const repo = new TenantRepository(insertChain(baseRow) as any);
    const result = await repo.create({
      name: 'Kicks HQ',
      slug: 'kickshq',
      email: 'owner@kickshq.com',
      status: 'provisioning',
    });
    expect(result.id).toBe('tnt_1');
    expect(result.slug).toBe('kickshq');
  });

  it('findById returns null when not found', async () => {
    const repo = new TenantRepository(selectChain([]) as any);
    expect(await repo.findById('nope')).toBeNull();
  });

  it('findBySlug returns mapped record', async () => {
    const repo = new TenantRepository(selectChain([baseRow]) as any);
    const result = await repo.findBySlug('kickshq');
    expect(result?.slug).toBe('kickshq');
    expect(result?.status).toBe('provisioning');
  });

  it('update returns updated record', async () => {
    const updated = { ...baseRow, status: 'active' as const };
    const repo = new TenantRepository(updateReturningChain(updated) as any);
    const result = await repo.update('tnt_1', { status: 'active' });
    expect(result?.status).toBe('active');
  });
});


