import { CustomerUsersRepository } from '../../../../src/modules/auth/customer-users/customer-users.repository';

const baseRow = {
  id: 'cus_1',
  tenantId: 'tnt_1',
  email: 'user@example.com',
  fullName: null,
  cognitoSub: 'sub-1',
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

describe('CustomerUsersRepository', () => {
  it('findByTenantAndEmail returns null when not found', async () => {
    const repo = new CustomerUsersRepository(selectChain([]) as any);
    expect(await repo.findByTenantAndEmail('tnt_1', 'x@y.com')).toBeNull();
  });

  it('findByTenantAndCognitoSub returns mapped record', async () => {
    const repo = new CustomerUsersRepository(selectChain([baseRow]) as any);
    const result = await repo.findByTenantAndCognitoSub('tnt_1', 'sub-1');
    expect(result?.cognitoSub).toBe('sub-1');
    expect(result?.tenantId).toBe('tnt_1');
  });

  it('create inserts and returns mapped record', async () => {
    const repo = new CustomerUsersRepository(insertChain(baseRow) as any);
    const result = await repo.create({
      tenantId: 'tnt_1',
      email: 'user@example.com',
      cognitoSub: 'sub-1',
      status: 'active',
    });
    expect(result.id).toBe('cus_1');
  });

  it('lastLoginAt Date converts to ISO string', async () => {
    const now = new Date('2025-06-01T12:00:00.000Z');
    const repo = new CustomerUsersRepository(
      selectChain([{ ...baseRow, lastLoginAt: now }]) as any,
    );
    const result = await repo.findByTenantAndEmail('tnt_1', 'user@example.com');
    expect(result?.lastLoginAt).toBe('2025-06-01T12:00:00.000Z');
  });
});
