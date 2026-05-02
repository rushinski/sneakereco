import { ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';

import { RequestLoggingInterceptor } from '@/common/interceptors/request-logging.interceptor';
import { LoggerService } from '@/core/observability/logging/logger.service';

function makeContext(method = 'GET', url = '/test', statusCode = 200) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, url }),
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

describe('RequestLoggingInterceptor', () => {
  let interceptor: RequestLoggingInterceptor;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    const logger = { log: jest.fn() } as unknown as LoggerService;
    interceptor = new RequestLoggingInterceptor(logger);
    logSpy = jest.spyOn(logger, 'log');
  });

  it('logs a completed request on success', (done) => {
    const ctx = makeContext('GET', '/health', 200);
    const next = { handle: () => of({ ok: true }) };

    interceptor.intercept(ctx, next).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(
          'HTTP request completed',
          expect.objectContaining({
            eventName: 'http.request',
            metadata: expect.objectContaining({ method: 'GET', url: '/health', statusCode: 200 }),
          }),
        );
        done();
      },
    });
  });

  it('logs a failed request on error', (done) => {
    const ctx = makeContext('POST', '/auth/login', 500);
    const next = { handle: () => throwError(() => new Error('boom')) };

    interceptor.intercept(ctx, next).subscribe({
      error: () => {
        expect(logSpy).toHaveBeenCalledWith(
          'HTTP request failed',
          expect.objectContaining({ eventName: 'http.request.error' }),
        );
        done();
      },
    });
  });
});
