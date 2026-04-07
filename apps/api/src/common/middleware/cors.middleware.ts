import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import type { OriginResolverService } from '../origins/origin-resolver.service';

const ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Request-ID', 'X-CSRF-Token'];
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

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
        request.path === '/v1/csrf-token' &&
        (request.method === 'GET' || request.method === 'OPTIONS');
      const originGroup = allowAnyOrigin
        ? 'platform'
        : await this.originResolver.classifyOrigin(origin);
      const isAllowed = allowAnyOrigin || originGroup !== 'unknown';

      if (isAllowed) {
        response.header('Access-Control-Allow-Origin', origin);
        response.header('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
        response.header('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
        response.header('Access-Control-Allow-Credentials', 'true');
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
