import { describe, expect, it, jest } from '@jest/globals';

import { CorsMiddleware } from '../../../src/common/middleware/cors.middleware';

describe('CorsMiddleware', () => {
  it('allows the app surface header in successful preflight responses', async () => {
    const originResolver = {
      classifyOrigin: jest.fn().mockResolvedValue({
        origin: 'platform',
        tenantId: null,
        tenantSlug: null,
      }),
    };

    const middleware = new CorsMiddleware(originResolver as never);
    const header = jest.fn();
    const append = jest.fn();
    const end = jest.fn();
    const status = jest.fn(() => ({ end }));
    const next = jest.fn();

    await middleware.use(
      {
        headers: { origin: 'https://sneakereco.test' },
        method: 'OPTIONS',
        path: '/v1/csrf-token',
      } as never,
      {
        append,
        header,
        status,
      } as never,
      next,
    );

    expect(header).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      expect.stringContaining('X-App-Surface'),
    );
    expect(status).toHaveBeenCalledWith(204);
    expect(end).toHaveBeenCalled();
  });
});
