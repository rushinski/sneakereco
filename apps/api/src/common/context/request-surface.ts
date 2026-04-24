export type AppSurface = 'platform-admin' | 'store-admin' | 'customer' | 'unknown';

export type HostType = 'platform' | 'store-public' | 'store-admin-host' | 'unknown';

export interface SurfaceTenantContext {
  subdomain: string;
  customDomain: string | null;
  adminDomain: string | null;
}

export interface RequestSurfaceResolution {
  hostType: HostType;
  surface: AppSurface;
  canonicalHost: string | null;
  isCanonicalHost: boolean;
}

export function normalizeAppSurfaceHeader(value: string | undefined): AppSurface {
  if (value === 'tenant-admin') return 'store-admin';
  if (value === 'platform-admin' || value === 'store-admin' || value === 'customer') {
    return value;
  }

  return 'unknown';
}

export function resolveRequestSurface(input: {
  appHost: string;
  appSurface: AppSurface;
  platformHosts: { platform: string; dashboard: string };
  tenant: SurfaceTenantContext | null;
}): RequestSurfaceResolution {
  const appHost = input.appHost.toLowerCase();
  const platformHost = input.platformHosts.platform.toLowerCase();
  const dashboardHost = input.platformHosts.dashboard.toLowerCase();

  if (appHost === platformHost || appHost === dashboardHost) {
    const canonicalHost = dashboardHost || platformHost;
    return {
      hostType: 'platform',
      surface: 'platform-admin',
      canonicalHost,
      isCanonicalHost: appHost === canonicalHost,
    };
  }

  if (input.tenant?.adminDomain && appHost === input.tenant.adminDomain.toLowerCase()) {
    return {
      hostType: 'store-admin-host',
      surface: 'store-admin',
      canonicalHost: input.tenant.adminDomain.toLowerCase(),
      isCanonicalHost: true,
    };
  }

  if (input.tenant) {
    const managedCustomerHost = `${input.tenant.subdomain}.${platformHost}`.toLowerCase();

    if (appHost === managedCustomerHost) {
      const surface = input.appSurface === 'store-admin' ? 'store-admin' : 'customer';
      const canonicalHost =
        surface === 'customer' && input.tenant.customDomain
          ? input.tenant.customDomain.toLowerCase()
          : managedCustomerHost;

      return {
        hostType: 'store-public',
        surface,
        canonicalHost,
        isCanonicalHost: appHost === canonicalHost,
      };
    }

    if (input.tenant.customDomain && appHost === input.tenant.customDomain.toLowerCase()) {
      return {
        hostType: 'store-public',
        surface: 'customer',
        canonicalHost: input.tenant.customDomain.toLowerCase(),
        isCanonicalHost: true,
      };
    }
  }

  return {
    hostType: 'unknown',
    surface: 'unknown',
    canonicalHost: null,
    isCanonicalHost: false,
  };
}
