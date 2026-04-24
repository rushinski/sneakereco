import { AdminAccountClassifierService } from '../../../../../../src/modules/auth/shared/pool-resolver/admin-account-classifier.service';

describe('AdminAccountClassifierService', () => {
  it('returns store-admin only when the email has admin membership in the current tenant', async () => {
    const service = new AdminAccountClassifierService(
      { hasStoreAdminMembership: jest.fn().mockResolvedValue(true) } as never,
      { getUserGroups: jest.fn().mockResolvedValue([]) } as never,
    );

    await expect(
      service.classifyForStoreAdminSurface({
        email: 'owner@heatkings.com',
        tenantId: 'tnt_heatkings',
      }),
    ).resolves.toBe('store-admin');
  });

  it('returns platform-admin for a platform operator on any store-admin surface', async () => {
    const service = new AdminAccountClassifierService(
      { hasStoreAdminMembership: jest.fn().mockResolvedValue(false) } as never,
      { getUserGroups: jest.fn().mockResolvedValue(['platform-admin']) } as never,
    );

    await expect(
      service.classifyForStoreAdminSurface({
        email: 'jacob@sneakereco.com',
        tenantId: 'tnt_heatkings',
      }),
    ).resolves.toBe('platform-admin');
  });

  it('returns unavailable for a store admin on the wrong tenant', async () => {
    const service = new AdminAccountClassifierService(
      { hasStoreAdminMembership: jest.fn().mockResolvedValue(false) } as never,
      { getUserGroups: jest.fn().mockResolvedValue([]) } as never,
    );

    await expect(
      service.classifyForStoreAdminSurface({
        email: 'owner@heatkings.com',
        tenantId: 'tnt_other',
      }),
    ).resolves.toBe('unavailable');
  });
});
