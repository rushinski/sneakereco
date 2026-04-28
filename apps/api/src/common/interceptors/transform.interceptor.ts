import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  meta: {
    requestId?: string;
    timestamp: string;
  };
}

/**
 * Wraps all successful responses in the standard envelope:
 *
 * ```json
 * {
 *   "data": { ... },
 *   "meta": {
 *     "requestId": "...",
 *     "timestamp": "..."
 *   }
 * }
 * ```
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          requestId: request.headers['x-request-id'] as string | undefined,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
