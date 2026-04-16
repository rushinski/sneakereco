import type { Request, Response } from 'express';

import { generateCsrfToken } from '../../common/middleware/csrf/csrf.config';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  REFRESH_MAX_AGE,
  SecurityConfig,
} from '../../config/security.config';
import type { LoginResponse, ResolvedRole, ResolvedTokenResult } from './auth.types';

export function buildLoginResponse(
  request: Request,
  response: Response,
  security: SecurityConfig,
  result: ResolvedTokenResult,
): LoginResponse {
  const csrfToken = generateCsrfToken(request, response, { overwrite: true });
  setRefreshCookie(response, security, result.refreshToken, result.authContext);

  return {
    accessToken: result.accessToken,
    idToken: result.idToken,
    expiresIn: result.expiresIn,
    csrfToken,
  };
}

export function clearAuthCookies(response: Response, security: SecurityConfig): void {
  response.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: security.cookieSecure,
    sameSite: 'none',
    path: AUTH_COOKIE_PATH,
    partitioned: true,
    ...(security.cookieDomain ? { domain: security.cookieDomain } : {}),
  });

  response.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: security.cookieSecure,
    sameSite: 'none',
    path: AUTH_COOKIE_PATH,
    partitioned: true,
    ...(security.cookieDomain ? { domain: security.cookieDomain } : {}),
  });
}

function setRefreshCookie(
  response: Response,
  security: SecurityConfig,
  refreshToken: string,
  authContext: ResolvedRole,
): void {
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: security.cookieSecure,
    sameSite: 'none',
    path: AUTH_COOKIE_PATH,
    maxAge: REFRESH_MAX_AGE[authContext],
    partitioned: true,
    ...(security.cookieDomain ? { domain: security.cookieDomain } : {}),
  });
}
