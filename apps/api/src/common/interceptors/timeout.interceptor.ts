import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable, RequestTimeoutException } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Enforces a request-level timeout. If the handler does not respond within
 * the timeout window, a 408 RequestTimeoutException is thrown.
 *
 * This is defence-in-depth alongside the database-level
 * `statement_timeout = '30s'` on the sneakereco_app role.
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('Request timed out'));
        }
        return throwError(() => err);
      }),
    );
  }
}
