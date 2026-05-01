export const authCookieName = '__Secure-sneakereco_session';

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.API_BASE_URL ??
  'https://api.sneakereco.test';

const signingSecret = process.env.SESSION_SIGNING_SECRET;

if (!signingSecret) {
  throw new Error('SESSION_SIGNING_SECRET is required for tenant-web BFF auth cookies');
}

export const sessionSigningSecret = signingSecret;

export const refreshTtlSeconds = {
  customer: Number(process.env.CUSTOMER_REFRESH_TOKEN_TTL_SECONDS ?? 2_592_000),
  tenant_admin: Number(process.env.ADMIN_REFRESH_TOKEN_TTL_SECONDS ?? 86_400),
  platform_admin: Number(process.env.ADMIN_REFRESH_TOKEN_TTL_SECONDS ?? 86_400),
} as const;