import { TenantSetupInvitationsRepository } from '../../../../src/modules/platform-onboarding/invitations/tenant-setup-invitations.repository';

const expiresAt = new Date(Date.now() + 86400000);
const baseRow = {
  id: 'tsi_1',
  tenantId: 'tnt_1',
  adminUserId: 'adm_1',
  tokenHash: 'hash123',
  status: 'issued' as const,
  sentAt: new Date(),
  expiresAt,
  consumedAt: null,
  revokedAt: null,
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

describe('TenantSetupInvitationsRepository', () => {
  it('issue inserts and returns record', async () => {
    const repo = new TenantSetupInvitationsRepository(insertChain(baseRow) as any);
    const result = await repo.issue({
      tenantId: 'tnt_1',
      adminUserId: 'adm_1',
      rawToken: 'rawtoken',
      expiresAt: expiresAt.toISOString(),
    });
    expect(result.id).toBe('tsi_1');
    expect(result.expiresAt).toBe(expiresAt.toISOString());
  });

  it('findByTenantId returns null when not found', async () => {
    const repo = new TenantSetupInvitationsRepository(selectChain([]) as any);
    expect(await repo.findByTenantId('tnt_nope')).toBeNull();
  });

  it('findByTenantId returns mapped record', async () => {
    const repo = new TenantSetupInvitationsRepository(selectChain([baseRow]) as any);
    const result = await repo.findByTenantId('tnt_1');
    expect(result?.tenantId).toBe('tnt_1');
    expect(result?.status).toBe('issued');
  });

  it('consume returns null when no matching token', async () => {
    const selectLimit = jest.fn().mockResolvedValue([]);
    const repo = new TenantSetupInvitationsRepository({ db: {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({ limit: selectLimit }),
        }),
      }),
    } } as any);
    expect(await repo.consume('bad-token')).toBeNull();
  });
});


