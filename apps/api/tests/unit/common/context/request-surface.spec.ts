import { normalizeAppSurfaceHeader } from '../../../../src/common/context/request-surface';

describe('normalizeAppSurfaceHeader', () => {
  it('maps legacy tenant-admin to store-admin and rejects unknown values', () => {
    expect(normalizeAppSurfaceHeader('platform-admin')).toBe('platform-admin');
    expect(normalizeAppSurfaceHeader('tenant-admin')).toBe('store-admin');
    expect(normalizeAppSurfaceHeader('store-admin')).toBe('store-admin');
    expect(normalizeAppSurfaceHeader('customer')).toBe('customer');
    expect(normalizeAppSurfaceHeader('weird')).toBe('unknown');
  });
});
