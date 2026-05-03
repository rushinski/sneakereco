import { AuthSessionRepository } from '../../../../src/modules/auth/session-control/auth-session.repository';

const now = new Date('2025-01-01T00:00:00.000Z');

const baseRow = {
  id: 'ses_1',
  actorType: 'tenant_admin' as const,
  adminUserId: 'adm_1',
  customerUserId: null,
  tenantId: 'tnt_1',
  userPoolId: 'pool_1',
  appClientId: 'client_1',
  cognitoSub: 'sub-1',
  deviceId: 'dev_1',
  sessionVersion: 'v1',
  refreshTokenFingerprint: 'fp_1',
  originJti: 'jti_1',
  status: 'active' as const,
  issuedAt: now,
  expiresAt: new Date(now.getTime() + 86400000),
  lastSeenAt: null,
  lastRefreshAt: null,
  ipAddress: null,
  userAgent: null,
  revokedAt: null,
  revocationReason: null,
  createdAt: now,
  updatedAt: now,
};

function selectChain(rows: unknown[]) {
  const limit = jest.fn().mockResolvedValue(rows);
  const where = jest.fn().mockReturnValue({ limit });
  const from = jest.fn().mockReturnValue({ where });
  return { db: { select: jest.fn().mockReturnValue({ from }) } };
}

function selectArrayChain(rows: unknown[]) {
  const where = jest.fn().mockResolvedValue(rows);
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

describe('AuthSessionRepository', () => {
  it('findById returns null when not found', async () => {
    const repo = new AuthSessionRepository(selectChain([]) as any);
    expect(await repo.findById('ses_1')).toBeNull();
  });

  it('findById maps Date fields to ISO strings', async () => {
    const repo = new AuthSessionRepository(selectChain([baseRow]) as any);
    const result = await repo.findById('ses_1');
    expect(result?.issuedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(result?.adminUserId).toBe('adm_1');
    expect(result?.customerUserId).toBeUndefined();
  });

  it('create inserts session and returns mapped record', async () => {
    const repo = new AuthSessionRepository(insertChain(baseRow) as any);
    const result = await repo.create({
      actorType: 'tenant_admin',
      adminUserId: 'adm_1',
      tenantId: 'tnt_1',
      userPoolId: 'pool_1',
      appClientId: 'client_1',
      cognitoSub: 'sub-1',
      deviceId: 'dev_1',
      sessionVersion: 'v1',
      refreshTokenFingerprint: 'fp_1',
      originJti: 'jti_1',
      status: 'active',
      issuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 86400000).toISOString(),
    });
    expect(result.id).toBe('ses_1');
    expect(result.issuedAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('revokeById calls update', async () => {
    const chain = updateChain();
    const repo = new AuthSessionRepository(chain as any);
    await repo.revokeById('ses_1', 'logout');
    expect(chain.db.update).toHaveBeenCalled();
  });

  it('findActiveBySubject returns array', async () => {
    const repo = new AuthSessionRepository(selectArrayChain([baseRow]) as any);
    const results = await repo.findActiveBySubject('sub-1', 'pool_1');
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('ses_1');
  });
});
