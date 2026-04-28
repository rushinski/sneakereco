import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';

import { CsrfService } from '../../core/security/csrf/csrf.service';

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
  constructor(private readonly csrfService: CsrfService) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    return new Promise((resolve, reject) => {
      this.csrfService.protect(req, res, (error?: unknown) => {
        if (!error) {
          resolve(true);
          return;
        }

        reject(new ForbiddenException('Invalid CSRF token'));
      });
    });
  }
}
