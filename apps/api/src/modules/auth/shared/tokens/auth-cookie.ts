import type { Request, Response } from 'express';

import { CsrfService } from '../../../../core/security/csrf/csrf.service';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  REFRESH_MAX_AGE,
  SecurityConfig,
} from '../../../../config/security.config';
import type { LoginResponse, TokenResult, UserType } from '../../auth.types';

export function buildLoginResponse(
  request: Request,
  response: Response,
  security: SecurityConfig,
  csrfService: CsrfService,
  result: TokenResult,
  userType: UserType,
): LoginResponse {
  const csrfToken = csrfService.generateToken(request, response);
  setRefreshCookie(response, security, result.refreshToken, userType);

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
  userType: UserType,
): void {
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: security.cookieSecure,
    sameSite: 'none',
    path: AUTH_COOKIE_PATH,
    maxAge: REFRESH_MAX_AGE[userType],
    partitioned: true,
    ...(security.cookieDomain ? { domain: security.cookieDomain } : {}),
  });
}
