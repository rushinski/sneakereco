import type { FastifyReply, FastifyRequest } from 'fastify';

import { RequestCtx } from '../../../../common/context/request-context';
import type { CsrfService } from '../../../../core/security/csrf/csrf.service';
import type { SecurityConfig } from '../../../../config/security.config';
import { AUTH_COOKIE_PATH, REFRESH_MAX_AGE } from '../../../../config/security.config';
import type { LoginResponse, TokenResult, UserType } from '../../auth.types';

export function buildSurfaceKey(input: {
  surface: UserType;
  canonicalHost?: string | null;
  host?: string | null;
}): string {
  const host = (input.canonicalHost ?? input.host ?? '').toLowerCase();
  return `${input.surface}:${host}`;
}

export function buildSurfaceCookieNames(surfaceKey: string) {
  const suffix = surfaceKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return {
    refresh: `__Secure-sneakereco-refresh-${suffix}`,
    csrf: `__Secure-sneakereco-csrf-${suffix}`,
  };
}

export function buildLoginResponse(
  request: FastifyRequest,
  response: FastifyReply,
  security: SecurityConfig,
  csrfService: CsrfService,
  result: TokenResult,
  userType: UserType,
): LoginResponse {
  const csrfToken = csrfService.generateToken(request, response);
  setRefreshCookie(request, response, security, result.refreshToken, userType);

  return {
    accessToken: result.accessToken,
    idToken: result.idToken,
    expiresIn: result.expiresIn,
    csrfToken,
  };
}

export function resolveCurrentSurfaceKey(request: FastifyRequest, surface?: UserType): string | null {
  const ctx = RequestCtx.get();
  const resolvedSurface =
    surface ?? (ctx?.surface && ctx.surface !== 'unknown' ? ctx.surface : null);
  const host = ctx?.canonicalHost ?? ctx?.host ?? request.hostname ?? null;

  if (!resolvedSurface || !host) {
    return null;
  }

  return buildSurfaceKey({
    surface: resolvedSurface,
    canonicalHost: ctx?.canonicalHost,
    host,
  });
}

export function readRefreshCookie(request: FastifyRequest, surface?: UserType): string | null {
  const surfaceKey = resolveCurrentSurfaceKey(request, surface);
  if (!surfaceKey) {
    return null;
  }

  const cookieName = buildSurfaceCookieNames(surfaceKey).refresh;
  return request.cookies[cookieName] ?? null;
}

export function clearAuthCookies(
  request: FastifyRequest,
  response: FastifyReply,
  _security: SecurityConfig,
  surface?: UserType,
): void {
  const surfaceKey = resolveCurrentSurfaceKey(request, surface);
  if (!surfaceKey) {
    return;
  }

  const cookieNames = buildSurfaceCookieNames(surfaceKey);

  response.clearCookie(cookieNames.refresh, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: AUTH_COOKIE_PATH,
    partitioned: true,
  });

  response.clearCookie(cookieNames.csrf, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: AUTH_COOKIE_PATH,
    partitioned: true,
  });
}

function setRefreshCookie(
  request: FastifyRequest,
  response: FastifyReply,
  _security: SecurityConfig,
  refreshToken: string,
  userType: UserType,
): void {
  const surfaceKey = resolveCurrentSurfaceKey(request, userType);
  if (!surfaceKey) {
    return;
  }

  const cookieName = buildSurfaceCookieNames(surfaceKey).refresh;

  response.setCookie(cookieName, refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: AUTH_COOKIE_PATH,
    maxAge: REFRESH_MAX_AGE[userType],
    partitioned: true,
  });
}
