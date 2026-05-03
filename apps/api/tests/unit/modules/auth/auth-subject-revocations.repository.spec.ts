import { AuthSubjectRevocationsRepository } from '../../../../src/modules/auth/session-control/auth-subject-revocations.repository';

const now = new Date('2025-01-01T00:00:00.000Z');
const baseRow = {
  id: 'rev_1',
  cognitoSub: 'sub-1',
  userPoolId: 'pool_1',
  revokeBefore: now,
  createdAt: now,
  updatedAt: now,
};

function selectChain(rows: unknown[]) {
  const limit = jest.fn().mockResolvedValue(rows);
  const where = jest.fn().mockReturnValue({ limit });
  const from = jest.fn().mockReturnValue({ where });
  return { db: { select: jest.fn().mockReturnValue({ from }) } };
}

function upsertChain(row: unknown) {
  const returning = jest.fn().mockResolvedValue([row]);
  const onConflict = jest.fn().mockReturnValue({ returning });
  const values = jest.fn().mockReturnValue({ onConflictDoUpdate: onConflict });
  return { db: { insert: jest.fn().mockReturnValue({ values }) } };
}

describe('AuthSubjectRevocationsRepository', () => {
  it('findBySubject returns null when not found', async () => {
    const repo = new AuthSubjectRevocationsRepository(selectChain([]) as any);
    expect(await repo.findBySubject('sub-1', 'pool_1')).toBeNull();
  });

  it('findBySubject returns record with ISO string', async () => {
    const repo = new AuthSubjectRevocationsRepository(selectChain([baseRow]) as any);
    const result = await repo.findBySubject('sub-1', 'pool_1');
    expect(result?.revokeBefore).toBe('2025-01-01T00:00:00.000Z');
  });

  it('upsert inserts and returns record', async () => {
    const repo = new AuthSubjectRevocationsRepository(upsertChain(baseRow) as any);
    const result = await repo.upsert('sub-1', 'pool_1', now.toISOString());
    expect(result.cognitoSub).toBe('sub-1');
    expect(result.revokeBefore).toBe('2025-01-01T00:00:00.000Z');
  });
});
