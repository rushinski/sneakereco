import { describe, expect, it, jest } from '@jest/globals';

import { RequestIdMiddleware } from '../../../src/common/middleware/request-id.middleware';

describe('RequestIdMiddleware', () => {
  it('sets a response request id header when one is missing', () => {
    const middleware = new RequestIdMiddleware();
    const request = { headers: {} } as any;
    const reply = { header: jest.fn() } as any;

    middleware.use(request, reply, () => undefined);

    expect(typeof request.headers['x-request-id']).toBe('string');
    expect(reply.header).toHaveBeenCalledWith('X-Request-ID', request.headers['x-request-id']);
  });

  it('reuses an incoming request id when one is already present', () => {
    const middleware = new RequestIdMiddleware();
    const request = { headers: { 'x-request-id': 'req_existing' } } as any;
    const reply = { header: jest.fn() } as any;

    middleware.use(request, reply, () => undefined);

    expect(request.headers['x-request-id']).toBe('req_existing');
    expect(reply.header).toHaveBeenCalledWith('X-Request-ID', 'req_existing');
  });
});
