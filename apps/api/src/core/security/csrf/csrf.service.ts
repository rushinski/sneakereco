import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { doubleCsrf } from 'csrf-csrf';
import type { NextFunction, Request, Response } from 'express';

import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_IGNORED_METHODS,
} from '../../../config/security.config';

@Injectable()
export class CsrfService {
  private readonly csrf;

  constructor(private readonly configService: ConfigService) {
    const csrfSecret = this.configService.getOrThrow<string>('CSRF_SECRET');
    const nodeEnv = this.configService.getOrThrow<string>('NODE_ENV');
    const cookieSecure = nodeEnv === 'production';

    this.csrf = doubleCsrf({
      getSecret: () => csrfSecret,
      getSessionIdentifier: () => 'sneakereco',
      cookieName: CSRF_COOKIE_NAME,
      cookieOptions: {
        sameSite: 'none',
        path: AUTH_COOKIE_PATH,
        secure: cookieSecure,
        httpOnly: true,
        partitioned: true,
      },
      getCsrfTokenFromRequest: (req) =>
        req.headers[CSRF_HEADER_NAME] as string,
      ignoredMethods: [...CSRF_IGNORED_METHODS],
    });
  }

  generateToken(req: Request, res: Response): string {
    return this.csrf.generateCsrfToken(req, res);
  }

  protect(req: Request, res: Response, next: NextFunction): void {
    this.csrf.doubleCsrfProtection(req, res, next);
  }

  isInvalidTokenError(error: unknown): boolean {
    return error === this.csrf.invalidCsrfTokenError;
  }
}