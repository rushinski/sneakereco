import type { NestMiddleware } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { parseCookieHeader } from '../utils/cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(request.method.toUpperCase())) {
      next();
      return;
    }

    if (!request.headers.origin) {
      next();
      return;
    }

    const cookies = parseCookieHeader(request.headers.cookie);
    const cookieToken = cookies.csrf_token;
    const headerToken = request.headers['x-csrf-token'];
    const normalizedHeaderToken = Array.isArray(headerToken) ? headerToken[0] : headerToken;

    if (!cookieToken || !normalizedHeaderToken || cookieToken !== normalizedHeaderToken) {
      next(new ForbiddenException('Invalid CSRF token'));
      return;
    }

    next();
  }
}
