import { AdminUsersRepository } from '../../../../src/modules/auth/admin-users/admin-users.repository';

const baseRow = {
  id: 'adm_1',
  email: 'admin@example.com',
  fullName: null,
  cognitoSub: 'sub-1',
  adminType: 'platform_admin' as const,
  status: 'active' as const,
  lastLoginAt: null,
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

function updateChain() {
  const where = jest.fn().mockResolvedValue(undefined);
  const set = jest.fn().mockReturnValue({ where });
  return { db: { update: jest.fn().mockReturnValue({ set }) } };
}

describe('AdminUsersRepository', () => {
  it('findById returns mapped record', async () => {
    const repo = new AdminUsersRepository(selectChain([baseRow]) as any);
    const result = await repo.findById('adm_1');
    expect(result?.id).toBe('adm_1');
    expect(result?.email).toBe('admin@example.com');
    expect(result?.lastLoginAt).toBeUndefined();
  });

  it('findById returns null when not found', async () => {
    const repo = new AdminUsersRepository(selectChain([]) as any);
    expect(await repo.findById('nope')).toBeNull();
  });

  it('findById converts lastLoginAt Date to ISO string', async () => {
    const now = new Date('2025-01-01T00:00:00.000Z');
    const repo = new AdminUsersRepository(
      selectChain([{ ...baseRow, lastLoginAt: now }]) as any,
    );
    const result = await repo.findById('adm_1');
    expect(result?.lastLoginAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('create inserts row and returns mapped record', async () => {
    const repo = new AdminUsersRepository(insertChain(baseRow) as any);
    const result = await repo.create({
      email: 'admin@example.com',
      cognitoSub: 'sub-1',
      adminType: 'platform_admin',
      status: 'active',
    });
    expect(result.email).toBe('admin@example.com');
    expect(result.adminType).toBe('platform_admin');
  });

  it('markActive issues update', async () => {
    const chain = updateChain();
    const repo = new AdminUsersRepository(chain as any);
    await repo.markActive('adm_1');
    expect(chain.db.update).toHaveBeenCalled();
  });
});
