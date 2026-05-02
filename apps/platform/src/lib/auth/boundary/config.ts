export const authCookieName = '__Secure-sneakereco_platform_session';

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.API_BASE_URL ??
  'https://api.sneakereco.test';

export function getSessionSigningSecret(): string {
  const secret = process.env.SESSION_SIGNING_SECRET;
  if (!secret) throw new Error('SESSION_SIGNING_SECRET is required for platform BFF auth cookies');
  return secret;
}

export const adminRefreshTtlSeconds = Number(process.env.ADMIN_REFRESH_TOKEN_TTL_SECONDS ?? 86_400);