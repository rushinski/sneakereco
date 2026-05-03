import { TenantCognitoConfigRepository } from '../../../../src/modules/tenants/tenant-cognito/tenant-cognito-config.repository';

const baseRow = {
  id: 'tcc_1',
  tenantId: 'tnt_1',
  userPoolId: 'pool_1',
  userPoolArn: 'arn:aws:pool_1',
  userPoolName: 'pool-name',
  customerClientId: 'client_1',
  customerClientName: 'client-name',
  region: 'us-east-1',
  provisioningStatus: 'ready' as const,
  provisioningFailedAt: null,
  provisioningFailureReason: null,
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

describe('TenantCognitoConfigRepository', () => {
  it('create inserts and returns record', async () => {
    const repo = new TenantCognitoConfigRepository(insertChain(baseRow) as any);
    const result = await repo.create({
      tenantId: 'tnt_1',
      userPoolId: 'pool_1',
      userPoolArn: 'arn:aws:pool_1',
      userPoolName: 'pool-name',
      customerClientId: 'client_1',
      customerClientName: 'client-name',
      region: 'us-east-1',
      provisioningStatus: 'ready',
    });
    expect(result.tenantId).toBe('tnt_1');
    expect(result.provisioningStatus).toBe('ready');
  });

  it('findByTenantId returns null when not found', async () => {
    const repo = new TenantCognitoConfigRepository(selectChain([]) as any);
    expect(await repo.findByTenantId('nope')).toBeNull();
  });

  it('findByTenantId returns mapped record', async () => {
    const repo = new TenantCognitoConfigRepository(selectChain([baseRow]) as any);
    const result = await repo.findByTenantId('tnt_1');
    expect(result?.userPoolId).toBe('pool_1');
  });
});


