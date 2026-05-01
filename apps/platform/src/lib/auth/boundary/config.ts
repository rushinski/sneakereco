export const authCookieName = '__Secure-sneakereco_platform_session';

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.API_BASE_URL ??
  'https://api.sneakereco.test';

const signingSecret = process.env.SESSION_SIGNING_SECRET;

if (!signingSecret) {
  throw new Error('SESSION_SIGNING_SECRET is required for platform BFF auth cookies');
}

export const sessionSigningSecret = signingSecret;

export const adminRefreshTtlSeconds = Number(process.env.ADMIN_REFRESH_TOKEN_TTL_SECONDS ?? 86_400);