import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { doubleCsrfProtection } from '../middleware/csrf/csrf.config';

/**
 * Validates the CSRF double-submit cookie for state-changing routes that opt in
 * to CSRF protection.
 *
 * Apply this guard only to routes that should require the X-CSRF-Token header
 * alongside the CSRF cookie, such as POST /v1/auth/refresh and
 * POST /v1/auth/logout.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;

    return new Promise<boolean>((resolve, reject) => {
      doubleCsrfProtection(req, res, (err?: unknown) => {
        if (err) reject(new ForbiddenException('Invalid CSRF token'));
        else resolve(true);
      });
    });
  }
}
