export type AppSurface = 'platform-admin' | 'store-admin' | 'customer' | 'unknown';

export type HostType = 'platform' | 'store-public' | 'store-admin-host' | 'unknown';

export function normalizeAppSurfaceHeader(value: string | undefined): AppSurface {
  if (value === 'tenant-admin') return 'store-admin';
  if (value === 'platform-admin' || value === 'store-admin' || value === 'customer') {
    return value;
  }

  return 'unknown';
}
