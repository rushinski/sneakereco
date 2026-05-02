import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';

import { AppError } from '../errors';

interface HttpReply {
  status(code: number): { send(body: unknown): void };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<HttpReply>();

    if (exception instanceof AppError) {
      const body: Record<string, unknown> = {
        statusCode: exception.statusCode,
        code: exception.code,
        message: exception.message,
      };

      if (exception.fieldErrors) {
        body['fieldErrors'] = exception.fieldErrors;
      }

      if (exception.details) {
        body['details'] = exception.details;
      }

      if (exception.statusCode >= 500) {
        this.logger.error(exception.message, exception.stack, { eventName: 'error.unhandled' });
      }

      return reply.status(exception.statusCode).send(body);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (status >= 500) {
        this.logger.error(exception.message, exception.stack, { eventName: 'error.http' });
      }

      return reply.status(status).send(
        typeof response === 'string'
          ? { statusCode: status, code: 'HTTP_ERROR', message: response }
          : response,
      );
    }

    this.logger.error(
      exception instanceof Error ? exception.message : 'Unexpected error',
      exception instanceof Error ? exception.stack : undefined,
      { eventName: 'error.unexpected' },
    );

    return reply.status(500).send({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  }
}
