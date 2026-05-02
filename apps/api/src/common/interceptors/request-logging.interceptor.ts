import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { LoggerService } from '../../core/observability/logging/logger.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ method: string; url: string }>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse<{ statusCode: number }>();
          this.logger.log('HTTP request completed', {
            eventName: 'http.request',
            metadata: {
              method: req.method,
              url: req.url,
              statusCode: res.statusCode,
              durationMs: Date.now() - start,
            },
          });
        },
        error: () => {
          this.logger.log('HTTP request failed', {
            eventName: 'http.request.error',
            metadata: {
              method: req.method,
              url: req.url,
              durationMs: Date.now() - start,
            },
          });
        },
      }),
    );
  }
}
