import type { TenantMemberRole } from '@sneakereco/db';

/**
 * Raw JWT claims from Cognito before any business-logic mapping.
 */
export interface CognitoJwtPayload {
  sub: string;
  email: string;
  iss: string;
  token_use: 'access' | 'id';
  client_id: string;
}

/**
 * The user object attached to request.user after JWT validation.
 */
export interface AuthenticatedUser {
  cognitoSub: string;
  email: string;
  isSuperAdmin: boolean;
  tenantId: string | undefined;
  role: TenantMemberRole | undefined;
  memberId: string | undefined;
}

/**
 * Role resolved from request origin plus the optional X-Client-Context header.
 */
export type ResolvedRole = 'customer' | 'admin' | 'platform';

export type TenantScopedRole = Exclude<ResolvedRole, 'platform'>;

export interface RoleContext {
  role: ResolvedRole;
  tenantId: string | undefined;
}

export interface TokenResult {
  type: 'tokens';
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

export interface ResolvedTokenResult extends TokenResult {
  authContext: ResolvedRole;
}

export interface MfaChallengeResult {
  type: 'mfa_required';
  session: string;
}

export interface MfaSetupResult {
  type: 'mfa_setup';
  session: string;
  email: string;
}

export type LoginResult = TokenResult | MfaChallengeResult | MfaSetupResult;

export type ResolvedLoginResult = ResolvedTokenResult | MfaChallengeResult | MfaSetupResult;

export interface RefreshResult {
  accessToken: string;
  idToken: string;
  expiresIn: number;
}

export interface LoginResponse extends RefreshResult {
  csrfToken: string;
}
