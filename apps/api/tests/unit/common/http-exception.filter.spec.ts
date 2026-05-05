import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';

import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('writes the standard envelope through reply code and send', () => {
    const filter = new HttpExceptionFilter();
    const reply = { code: jest.fn().mockReturnThis(), send: jest.fn() };
    const request = { method: 'GET', url: '/v1/test', headers: { 'x-request-id': 'req_123' } };
    const host = {
      switchToHttp: () => ({
        getResponse: () => reply,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new HttpException('Nope', HttpStatus.FORBIDDEN), host);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
        meta: expect.objectContaining({ requestId: 'req_123' }),
      }),
    );
  });
});
