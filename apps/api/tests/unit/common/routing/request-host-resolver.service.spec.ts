import { describe, expect, it, jest } from '@jest/globals';

import { RequestHostResolverService } from '../../../../src/common/routing/request-host-resolver.service';

describe('RequestHostResolverService', () => {
  function createConfigMock() {
    return {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'PLATFORM_URL') return 'https://sneakereco.test';
        throw new Error(`Unexpected config key: ${key}`);
      }),
      get: jest.fn((key: string) => {
        if (key === 'PLATFORM_DASHBOARD_URL') return 'https://dashboard.sneakereco.test';
        return undefined;
      }),
    };
  }

  it('returns null for malformed host input', async () => {
    const repository = {
      findByHostname: jest.fn(),
    };
    const valkey = {
      getJson: jest.fn(),
      setJson: jest.fn(),
    };

    const service = new RequestHostResolverService(
      createConfigMock() as never,
      repository as never,
      valkey as never,
    );

    await expect(service.resolveHost('%%%')).resolves.toBeNull();
    expect(repository.findByHostname).not.toHaveBeenCalled();
  });

  it('resolves platform hosts from env without hitting the repository', async () => {
    const repository = {
      findByHostname: jest.fn(),
    };
    const valkey = {
      getJson: jest.fn(),
      setJson: jest.fn(),
    };

    const service = new RequestHostResolverService(
      createConfigMock() as never,
      repository as never,
      valkey as never,
    );

    await expect(service.resolveHost('dashboard.sneakereco.test')).resolves.toEqual({
      hostname: 'dashboard.sneakereco.test',
      tenantId: null,
      surface: 'platform-admin',
      hostKind: 'platform',
      canonicalHost: 'dashboard.sneakereco.test',
      isCanonicalHost: true,
      redirectToHostname: null,
      status: 'active',
    });
    expect(repository.findByHostname).not.toHaveBeenCalled();
  });

  it('returns a resolved host for an active exact hostname match', async () => {
    const repository = {
      findByHostname: jest.fn().mockResolvedValue({
        hostname: 'admin.heatkings.test',
        tenantId: 'tnt_heatkings',
        surface: 'store-admin',
        hostKind: 'admin-custom',
        isCanonical: true,
        redirectToHostname: null,
        status: 'active',
      }),
    };
    const valkey = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
    };

    const service = new RequestHostResolverService(
      createConfigMock() as never,
      repository as never,
      valkey as never,
    );

    await expect(service.resolveHost('admin.heatkings.test')).resolves.toEqual({
      hostname: 'admin.heatkings.test',
      tenantId: 'tnt_heatkings',
      surface: 'store-admin',
      hostKind: 'admin-custom',
      canonicalHost: 'admin.heatkings.test',
      isCanonicalHost: true,
      redirectToHostname: null,
      status: 'active',
    });
  });

  it('caches lookup results in Valkey', async () => {
    const repository = {
      findByHostname: jest.fn().mockResolvedValue({
        hostname: 'heatkings.sneakereco.test',
        tenantId: 'tnt_heatkings',
        surface: 'customer',
        hostKind: 'managed',
        isCanonical: false,
        redirectToHostname: 'heatkings.com',
        status: 'active',
      }),
    };
    const valkey = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
    };

    const service = new RequestHostResolverService(
      createConfigMock() as never,
      repository as never,
      valkey as never,
    );

    await service.resolveHost('heatkings.sneakereco.test');

    expect(valkey.getJson).toHaveBeenCalledWith('request-host:heatkings.sneakereco.test');
    expect(valkey.setJson).toHaveBeenCalledWith(
      'request-host:heatkings.sneakereco.test',
      {
        hostname: 'heatkings.sneakereco.test',
        tenantId: 'tnt_heatkings',
        surface: 'customer',
        hostKind: 'managed',
        canonicalHost: 'heatkings.com',
        isCanonicalHost: false,
        redirectToHostname: 'heatkings.com',
        status: 'active',
      },
      300,
    );
  });
});
