import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';

type RequestLike = {
  method: string;
  url: string;
  headers: Record<string, unknown>;
};

type ReplyLike = {
  code(statusCode: number): ReplyLike;
  send(payload: unknown): void;
};

/**
 * Global exception filter. Formats all errors into the standard envelope:
 *
 * ```json
 * {
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Human-readable description",
 *     "details": { ... }
 *   },
 *   "meta": {
 *     "requestId": "...",
 *     "timestamp": "..."
 *   }
 * }
 * ```
 *
 * In production, unknown errors are sanitised to prevent leaking internals.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ReplyLike>();
    const request = ctx.getRequest<RequestLike>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Log the full error server-side for observability
    if (!isHttpException || status >= 500) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const { code, message, details } = this.extractErrorInfo(exception, status);

    response.code(status).send({
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      meta: {
        requestId:
          typeof request.headers['x-request-id'] === 'string'
            ? (request.headers['x-request-id'] as string)
            : undefined,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private extractErrorInfo(
    exception: unknown,
    status: number,
  ): { code: string; message: string; details?: unknown } {
    if (!(exception instanceof HttpException)) {
      // Never leak internal error details to the client
      return {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      };
    }

    const exceptionResponse = exception.getResponse();

    // NestJS validation pipes and our ZodValidationPipe return objects
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as Record<string, unknown>;
      return {
        code: this.statusToCode(status),
        message: typeof resp.message === 'string' ? resp.message : exception.message,
        details: resp.errors ?? resp.details,
      };
    }

    return {
      code: this.statusToCode(status),
      message: typeof exceptionResponse === 'string' ? exceptionResponse : exception.message,
    };
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      408: 'TIMEOUT',
      409: 'CONFLICT',
      429: 'RATE_LIMITED',
    };
    return map[status] ?? 'INTERNAL_ERROR';
  }
}
