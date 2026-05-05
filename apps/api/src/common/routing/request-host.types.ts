export type RequestHostSurface = 'platform' | 'platform-admin' | 'customer' | 'store-admin';

export type RequestHostKind =
  | 'platform'
  | 'managed'
  | 'admin-managed'
  | 'custom'
  | 'admin-custom'
  | 'alias';

export type RequestHostStatus = 'active' | 'disabled' | 'pending_verification';

export interface RequestHostRow {
  hostname: string;
  tenantId: string | null;
  surface: RequestHostSurface;
  hostKind: RequestHostKind;
  isCanonical: boolean;
  redirectToHostname: string | null;
  status: RequestHostStatus;
}

export interface ResolvedRequestHost {
  hostname: string;
  tenantId: string | null;
  surface: RequestHostSurface;
  hostKind: RequestHostKind;
  canonicalHost: string;
  isCanonicalHost: boolean;
  redirectToHostname: string | null;
  status: RequestHostStatus;
}
