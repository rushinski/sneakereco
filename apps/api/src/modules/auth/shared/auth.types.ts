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

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface CompletedAuthChallenge {
  actorType: ActorType;
  cognitoSub: string;
  userPoolId: string;
  appClientId: string;
  groups: string[];
  email: string;
  tenantId?: string;
  accessToken: string;
  refreshToken?: string;
  originJti: string;
}

export interface AdminLoginChallenge {
  status: 'mfa_required';
  challengeType: 'totp';
  challengeSessionToken: string;
}

export interface CustomerRegistrationResult {
  status: 'confirmation_required';
}

export interface CustomerConfirmationResult {
  cognitoSub: string;
  userPoolId: string;
  email: string;
  fullName?: string;
}

export interface OtpRequestResult {
  status: 'otp_sent';
}

export interface PasswordResetRequestResult {
  status: 'reset_requested';
}