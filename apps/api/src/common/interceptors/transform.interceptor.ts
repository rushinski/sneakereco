import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined>;
};

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
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const requestIdHeader = request.headers['x-request-id'];

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          requestId:
            typeof requestIdHeader === 'string' ? requestIdHeader : requestIdHeader?.[0],
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
