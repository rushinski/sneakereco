import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

import { OriginResolverService } from '../services/origin-resolver.service';
import {
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_METHODS,
  CORS_CREDENTIALS,
  CORS_PUBLIC_PATHS,
} from '../../config/security.config';

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  url: string;
};

type ReplyLike = {
  header(name: string, value: string): void;
  code(statusCode: number): { send(): void };
};

type Next = (error?: unknown) => void;

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  constructor(private readonly originResolver: OriginResolverService) {}

  use(request: RequestLike, response: ReplyLike, next: Next): void {
    void this.handle(request, response, next);
  }

  private async handle(request: RequestLike, response: ReplyLike, next: Next): Promise<void> {
    try {
      const originHeader = request.headers.origin;
      const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
      if (!origin) {
        next();
        return;
      }

      const allowAnyOrigin =
        CORS_PUBLIC_PATHS.has(this.readPathname(request.url)) &&
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
        response.header('Vary', 'Origin');
      }

      if (request.method === 'OPTIONS') {
        response.code(isAllowed ? 204 : 403).send();
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  private readPathname(url: string): string {
    return url.split('?', 1)[0] ?? url;
  }
}
