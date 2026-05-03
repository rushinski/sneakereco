import { TenantApplicationsRepository } from '../../../../src/modules/platform-onboarding/applications/tenant-applications.repository';

const baseRow = {
  id: 'tap_1',
  requestedByName: 'Alice',
  requestedByEmail: 'alice@example.com',
  businessName: 'Kicks HQ',
  instagramHandle: null,
  status: 'submitted' as const,
  reviewedByAdminUserId: null,
  reviewedAt: null,
  denialReason: null,
  approvedTenantId: null,
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

describe('TenantApplicationsRepository', () => {
  it('create inserts and returns record', async () => {
    const repo = new TenantApplicationsRepository(insertChain(baseRow) as any);
    const result = await repo.create({
      requestedByName: 'Alice',
      requestedByEmail: 'alice@example.com',
      businessName: 'Kicks HQ',
      status: 'submitted',
    });
    expect(result.id).toBe('tap_1');
    expect(result.status).toBe('submitted');
  });

  it('findById returns null when not found', async () => {
    const repo = new TenantApplicationsRepository(selectChain([]) as any);
    expect(await repo.findById('tap_nope')).toBeNull();
  });

  it('update returns updated record', async () => {
    const updated = { ...baseRow, status: 'approved' as const };
    const repo = new TenantApplicationsRepository(updateReturningChain(updated) as any);
    const result = await repo.update('tap_1', { status: 'approved' });
    expect(result?.status).toBe('approved');
  });

  it('update returns null when record not found', async () => {
    const chain = {
      db: {
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([]) }),
          }),
        }),
      },
    };
    const repo = new TenantApplicationsRepository(chain as any);
    expect(await repo.update('nope', { status: 'denied' })).toBeNull();
  });
});


