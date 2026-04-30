export type ActorType = 'platform_admin' | 'tenant_admin' | 'customer';

export interface AuthPrincipal {
  actorType: ActorType;
  cognitoSub: string;
  userPoolId: string;
  appClientId: string;
  sessionId: string;
  sessionVersion: string;
  issuedAt: string;
  groups: string[];
  adminType?: 'platform_admin' | 'tenant_admin';
  tenantId?: string;
}

export interface BffSession {
  refreshToken: string;
  principal: AuthPrincipal;
}

export interface BffAuthResponse {
  accessToken: string;
  principal: AuthPrincipal;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  request_id?: string;
  details?: unknown;
  field_errors?: Array<{ field: string; message: string }>;
}

export interface TenantContext {
  slug: string;
  tenantId: string;
  host: string;
}