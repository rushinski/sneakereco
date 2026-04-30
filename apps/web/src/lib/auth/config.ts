export const authCookieName = '__Secure-sneakereco_session';

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.API_BASE_URL ??
  'https://api.sneakereco.test';

export const sessionSigningSecret =
  process.env.SESSION_SIGNING_SECRET ?? 'development-session-signing-secret-0000';

export const refreshTtlSeconds = {
  customer: Number(process.env.CUSTOMER_REFRESH_TOKEN_TTL_SECONDS ?? 2_592_000),
  tenant_admin: Number(process.env.ADMIN_REFRESH_TOKEN_TTL_SECONDS ?? 86_400),
  platform_admin: Number(process.env.ADMIN_REFRESH_TOKEN_TTL_SECONDS ?? 86_400),
} as const;