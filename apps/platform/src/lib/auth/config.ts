export const authCookieName = '__Secure-sneakereco_platform_session';

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.API_BASE_URL ??
  'https://api.sneakereco.test';

export const sessionSigningSecret =
  process.env.SESSION_SIGNING_SECRET ?? 'development-session-signing-secret-0000';

export const adminRefreshTtlSeconds = Number(process.env.ADMIN_REFRESH_TOKEN_TTL_SECONDS ?? 86_400);