import { envSchema } from './env.schema';

export const AUTH_CLAIMS = {
  adminType: 'custom:admin_type',
  tenantId: 'custom:tenant_id',
  sessionId: 'custom:session_id',
  sessionVersion: 'custom:session_version',
} as const;

export type AuthClaimName = (typeof AUTH_CLAIMS)[keyof typeof AUTH_CLAIMS];

export function getAuthConfig(env: Record<string, string | undefined>) {
  const parsed = envSchema.parse(env);

  return {
    adminUserPoolId: parsed.COGNITO_ADMIN_USER_POOL_ID,
    platformAdminClientId: parsed.COGNITO_PLATFORM_ADMIN_CLIENT_ID,
    tenantAdminClientId: parsed.COGNITO_TENANT_ADMIN_CLIENT_ID,
    accessTokenTtlSeconds: parsed.ACCESS_TOKEN_TTL_SECONDS,
    adminRefreshTokenTtlSeconds: parsed.ADMIN_REFRESH_TOKEN_TTL_SECONDS,
    customerRefreshTokenTtlSeconds: parsed.CUSTOMER_REFRESH_TOKEN_TTL_SECONDS,
    authChallengeSessionTtlSeconds: parsed.AUTH_CHALLENGE_SESSION_TTL_SECONDS,
    claims: AUTH_CLAIMS,
  };
}

export type AuthConfig = ReturnType<typeof getAuthConfig>;