import type { TenantMemberRole } from '@sneakereco/db';

import type { AppSurface } from '../../common/context/request-surface';

/**
 * Raw JWT claims from Cognito before any business-logic mapping.
 */
export interface CognitoJwtPayload {
  sub: string;
  email?: string;
  iss: string;
  token_use: 'access' | 'id';
  client_id: string;
  username?: string;
  jti?: string;
  origin_jti?: string;
  auth_time?: number;
  'cognito:groups'?: string[];
}

/**
 * Which authenticated surface the request is operating on.
 */
export type UserType = Exclude<AppSurface, 'unknown'>;

/**
 * Permission level within a tenant's admin team.
 * Only present on store-admin users; null for customers and platform admins.
 */
export type TeamRole = TenantMemberRole;

/**
 * The user object attached to request.user after JWT validation.
 */
export interface AuthenticatedUser {
  cognitoSub: string;
  email: string;
  isSuperAdmin: boolean;
  tenantId: string | null;
  memberId: string | null;
  userType: UserType;
  teamRole: TeamRole | null;
  jti: string | null;
}

export interface TokenResult {
  type: 'tokens';
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
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

export interface OtpSentResult {
  type: 'otp_sent';
  session: string;
}

export type LoginResult = TokenResult | MfaChallengeResult | MfaSetupResult;

export type OtpVerifyResult = TokenResult | MfaChallengeResult;

export interface RefreshResult {
  accessToken: string;
  idToken: string;
  expiresIn: number;
}

export interface LoginResponse extends RefreshResult {
  csrfToken: string;
}
