import { AdminTenantRelationshipsRepository } from '../../../../src/modules/tenants/tenant-admin-relationships/admin-tenant-relationships.repository';

const baseRow = {
  id: 'atr_1',
  adminUserId: 'adm_1',
  tenantId: 'tnt_1',
  relationshipType: 'tenant_admin' as const,
  status: 'active' as const,
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

describe('AdminTenantRelationshipsRepository', () => {
  it('create inserts and returns record', async () => {
    const repo = new AdminTenantRelationshipsRepository(insertChain(baseRow) as any);
    const result = await repo.create({
      adminUserId: 'adm_1',
      tenantId: 'tnt_1',
      relationshipType: 'tenant_admin',
      status: 'active',
    });
    expect(result.adminUserId).toBe('adm_1');
    expect(result.status).toBe('active');
  });

  it('findActiveByAdminUserId returns null when not found', async () => {
    const repo = new AdminTenantRelationshipsRepository(selectChain([]) as any);
    expect(await repo.findActiveByAdminUserId('nope')).toBeNull();
  });

  it('findActiveByTenantId returns mapped record', async () => {
    const repo = new AdminTenantRelationshipsRepository(selectChain([baseRow]) as any);
    const result = await repo.findActiveByTenantId('tnt_1');
    expect(result?.tenantId).toBe('tnt_1');
    expect(result?.relationshipType).toBe('tenant_admin');
  });
});


