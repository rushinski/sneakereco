import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { OriginResolverService } from '../services/origin-resolver.service';
import { CORS_ALLOWED_HEADERS, CORS_ALLOWED_METHODS, CORS_CREDENTIALS, CORS_PUBLIC_PATHS } from '../../config/security.config';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  constructor(private readonly originResolver: OriginResolverService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    void this.handle(request, response, next);
  }

  private async handle(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const origin = request.headers.origin;
      if (!origin) {
        next();
        return;
      }

      const allowAnyOrigin =
        CORS_PUBLIC_PATHS.has(request.path) &&
        (request.method === 'GET' || request.method === 'OPTIONS');
      const originContext = allowAnyOrigin
        ? { origin: 'platform' as const, tenantId: null, tenantSlug: null }
        : await this.originResolver.classifyOrigin(origin);
      const isAllowed = allowAnyOrigin || originContext.origin !== 'unknown';

      if (isAllowed) {
        response.header('Access-Control-Allow-Origin', origin);
        response.header('Access-Control-Allow-Headers', CORS_ALLOWED_HEADERS.join(', '));
        response.header('Access-Control-Allow-Methods', CORS_ALLOWED_METHODS.join(', '));
        response.header('Access-Control-Allow-Credentials', String(CORS_CREDENTIALS));
        response.append('Vary', 'Origin');
      }

      if (request.method === 'OPTIONS') {
        response.status(isAllowed ? 204 : 403).end();
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}