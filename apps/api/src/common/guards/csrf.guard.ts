import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { doubleCsrfProtection } from '../middleware/csrf/csrf.config';

/**
 * Validates the CSRF double-submit cookie for state-changing requests that are
 * authenticated via cookie (not Bearer token).
 *
 * Skip conditions (in order):
 *  1. Safe HTTP methods (GET, HEAD, OPTIONS) — no state mutation possible.
 *  2. Requests that carry an Authorization: Bearer header — Bearer tokens are
 *     not auto-sent by the browser so there is no CSRF risk. Applying CSRF
 *     checks to Bearer-authed routes would break cross-site custom-domain
 *     clients and server-to-server calls.
 *
 * Apply this guard only to endpoints that rely on the httpOnly refresh-token
 * cookie (i.e. POST /v1/auth/refresh). Do NOT apply it globally.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;

    // Bearer-token authenticated requests are not CSRF-susceptible
    if (req.headers.authorization?.startsWith('Bearer ')) return true;

    return new Promise<boolean>((resolve, reject) => {
      doubleCsrfProtection(req, res, (err?: unknown) => {
        if (err) reject(new ForbiddenException('Invalid CSRF token'));
        else resolve(true);
      });
    });
  }
}
