import { randomBytes, timingSafeEqual } from 'crypto';

import { ForbiddenException, Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { RequestCtx } from '../../../common/context/request-context';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_IGNORED_METHODS,
} from '../../../config/security.config';
import {
  buildSurfaceCookieNames,
  buildSurfaceKey,
} from '../../../modules/auth/shared/tokens/auth-cookie';

@Injectable()
export class CsrfService {
  generateToken(_req: FastifyRequest, reply: FastifyReply): string {
    const token = randomBytes(32).toString('base64url');
    reply.setCookie(this.resolveCookieName(), token, {
      sameSite: 'none',
      path: AUTH_COOKIE_PATH,
      secure: true,
      httpOnly: true,
      partitioned: true,
    });
    return token;
  }

  protect(req: FastifyRequest): void {
    if (CSRF_IGNORED_METHODS.includes(req.method as (typeof CSRF_IGNORED_METHODS)[number])) {
      return;
    }

    const cookieName = this.resolveCookieName();
    const cookieToken = req.cookies[cookieName];
    const headerValue = req.headers[CSRF_HEADER_NAME];
    const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);
    const isValid =
      cookieBuffer.length === headerBuffer.length &&
      timingSafeEqual(cookieBuffer, headerBuffer);

    if (!isValid) {
      throw new ForbiddenException('Invalid CSRF token');
    }
  }

  isInvalidTokenError(error: unknown): boolean {
    return error instanceof ForbiddenException && error.message === 'Invalid CSRF token';
  }

  private resolveCookieName(): string {
    const ctx = RequestCtx.get();

    if (!ctx || ctx.surface === 'unknown') {
      return CSRF_COOKIE_NAME;
    }

    const surfaceKey = buildSurfaceKey({
      surface: ctx.surface,
      canonicalHost: ctx.canonicalHost,
      host: ctx.host,
    });

    return buildSurfaceCookieNames(surfaceKey).csrf;
  }
}
