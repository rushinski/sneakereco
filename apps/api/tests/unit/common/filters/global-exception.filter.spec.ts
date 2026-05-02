import { HttpException } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  InternalError,
  ConflictError,
} from '@/common/errors';

function makeHost(sendMock: jest.Mock, statusMock: jest.Mock) {
  return {
    switchToHttp: () => ({
      getResponse: () => ({
        status: statusMock,
      }),
    }),
  } as unknown as ArgumentsHost;
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let send: jest.Mock;
  let statusFn: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    send = jest.fn();
    statusFn = jest.fn().mockReturnValue({ send });
    host = makeHost(send, statusFn);
  });

  describe('AppError subclasses', () => {
    it('maps NotFoundError to 404', () => {
      filter.catch(new NotFoundError('User not found'), host);
      expect(statusFn).toHaveBeenCalledWith(404);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404, code: 'NOT_FOUND', message: 'User not found' }),
      );
    });

    it('maps ForbiddenError to 403', () => {
      filter.catch(new ForbiddenError(), host);
      expect(statusFn).toHaveBeenCalledWith(403);
    });

    it('includes fieldErrors when present', () => {
      filter.catch(new ValidationError('Bad input', { email: ['invalid'] }), host);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ fieldErrors: { email: ['invalid'] } }),
      );
    });

    it('includes details when present', () => {
      filter.catch(new ConflictError('Slug taken', { field: 'slug' }), host);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ details: { field: 'slug' } }),
      );
    });

    it('maps InternalError to 500', () => {
      filter.catch(new InternalError(), host);
      expect(statusFn).toHaveBeenCalledWith(500);
    });
  });

  describe('HttpException', () => {
    it('maps HttpException to its status', () => {
      filter.catch(new HttpException('Not Found', 404), host);
      expect(statusFn).toHaveBeenCalledWith(404);
    });

    it('passes through object responses from HttpException', () => {
      filter.catch(new HttpException({ message: 'Bad Request', error: 'x' }, 400), host);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Bad Request' }),
      );
    });
  });

  describe('unknown errors', () => {
    it('returns 500 for plain Error', () => {
      filter.catch(new Error('crash'), host);
      expect(statusFn).toHaveBeenCalledWith(500);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500, code: 'INTERNAL_ERROR' }),
      );
    });

    it('returns 500 for non-Error throw', () => {
      filter.catch('something weird', host);
      expect(statusFn).toHaveBeenCalledWith(500);
    });
  });
});
