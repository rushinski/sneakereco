import { TenantConfigService } from '../../../../src/modules/tenants/tenant-config/tenant-config.service';

describe('TenantConfigService.getConfig', () => {
  it('resolves a tenant by custom public host', async () => {
    const limit = jest
      .fn()
      .mockResolvedValueOnce([
        {
          tenantId: 'tnt_heatkings',
          subdomain: 'heatkings',
          customDomain: 'heatkings.com',
          adminDomain: 'admin.heatkings.com',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'tnt_heatkings',
          name: 'Heat Kings',
          slug: 'heatkings',
          businessName: 'Heat Kings',
          status: 'active',
        },
      ])
      .mockResolvedValueOnce([]);
    const where = jest.fn(() => ({ limit }));
    const from = jest.fn(() => ({ where }));
    const select = jest.fn(() => ({ from }));
    const tx = { select };
    const db = {
      withSystemContext: jest.fn(async (fn: (trx: typeof tx) => Promise<unknown>) => fn(tx)),
    };
    const config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'PLATFORM_URL') return 'https://sneakereco.com';
        throw new Error(`Unexpected config key: ${key}`);
      }),
    };
    const service = new TenantConfigService(db as never, config as never);

    await expect(service.getConfig({ host: 'heatkings.com' })).resolves.toMatchObject({
      tenant: { slug: 'heatkings' },
      routing: {
        canonicalHost: 'heatkings.com',
        canonicalCustomerHost: 'heatkings.com',
        isCanonicalHost: true,
      },
    });
  });
});
