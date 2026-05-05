import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

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

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<FastifyRequest>();

    try {
      this.csrfService.protect(req);
      return true;
    } catch {
      throw new ForbiddenException('Invalid CSRF token');
    }
  }
}
