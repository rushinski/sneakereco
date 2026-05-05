import { describe, expect, it, jest } from '@jest/globals';

import { buildCorsOptions } from '../../../src/config/cors.config';

function createDbMock(row: { hostname: string; status: string } | undefined) {
  return {
    systemDb: {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(row ? [row] : []),
          }),
        }),
      }),
    },
  };
}

function runOriginCheck(
  originFn: NonNullable<ReturnType<typeof buildCorsOptions>['origin']>,
  origin: string | undefined,
): Promise<string | false> {
  return new Promise((resolve, reject) => {
    originFn(origin, (error, allowedOrigin) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(allowedOrigin);
    });
  });
}

describe('buildCorsOptions', () => {
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

  it('allows configured platform origins without a tenant-hostname lookup', async () => {
    const db = createDbMock({
      hostname: 'ignored.test',
      status: 'active',
    });
    const valkey = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
    };

    const options = buildCorsOptions(db as never, valkey as never, createConfigMock() as never);

    await expect(runOriginCheck(options.origin!, 'https://sneakereco.test')).resolves.toBe(
      'https://sneakereco.test',
    );
    expect(db.systemDb.select).not.toHaveBeenCalled();
  });

  it('allows active origins found in tenant_hostnames', async () => {
    const db = createDbMock({
      hostname: 'heatkings.test',
      status: 'active',
    });
    const valkey = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
    };

    const options = buildCorsOptions(db as never, valkey as never, createConfigMock() as never);

    await expect(runOriginCheck(options.origin!, 'https://heatkings.test')).resolves.toBe(
      'https://heatkings.test',
    );
  });

  it('rejects unknown origins', async () => {
    const db = createDbMock(undefined);
    const valkey = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
    };

    const options = buildCorsOptions(db as never, valkey as never, createConfigMock() as never);

    await expect(runOriginCheck(options.origin!, 'https://unknown.test')).resolves.toBe(false);
  });

  it('does not require canonical hosts for CORS allow decisions', async () => {
    const db = createDbMock({
      hostname: 'www.soleshead.com',
      status: 'active',
    });
    const valkey = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
    };

    const options = buildCorsOptions(db as never, valkey as never, createConfigMock() as never);

    await expect(runOriginCheck(options.origin!, 'https://www.soleshead.com')).resolves.toBe(
      'https://www.soleshead.com',
    );
  });
});
