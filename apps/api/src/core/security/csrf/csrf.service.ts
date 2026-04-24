import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { doubleCsrf } from 'csrf-csrf';
import type { NextFunction, Request, Response } from 'express';

import { RequestCtx } from '../../../common/context/request-context';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_IGNORED_METHODS,
} from '../../../config/security.config';
import { buildSurfaceCookieNames, buildSurfaceKey } from '../../../modules/auth/shared/tokens/auth-cookie';

@Injectable()
export class CsrfService {
  private readonly csrfByCookieName = new Map<
    string,
    ReturnType<typeof doubleCsrf>
  >();
  private readonly csrfSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.csrfSecret = this.configService.getOrThrow<string>('CSRF_SECRET');
    const nodeEnv = this.configService.getOrThrow<string>('NODE_ENV');
  }

  generateToken(req: Request, res: Response): string {
    return this.getCsrf().generateCsrfToken(req, res);
  }

  protect(req: Request, res: Response, next: NextFunction): void {
    this.getCsrf().doubleCsrfProtection(req, res, next);
  }

  isInvalidTokenError(error: unknown): boolean {
    return error === this.getCsrf().invalidCsrfTokenError;
  }

  private getCsrf() {
    const cookieName = this.resolveCookieName();

    if (!this.csrfByCookieName.has(cookieName)) {
      this.csrfByCookieName.set(
        cookieName,
        doubleCsrf({
          getSecret: () => this.csrfSecret,
          getSessionIdentifier: () => 'sneakereco',
          cookieName,
          cookieOptions: {
            sameSite: 'none',
            path: AUTH_COOKIE_PATH,
            secure: true,
            httpOnly: true,
            partitioned: true,
          },
          getCsrfTokenFromRequest: (req) => req.headers[CSRF_HEADER_NAME] as string,
          ignoredMethods: [...CSRF_IGNORED_METHODS],
        }),
      );
    }

    return this.csrfByCookieName.get(cookieName)!;
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
