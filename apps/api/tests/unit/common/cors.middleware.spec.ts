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
    const send = jest.fn();
    const code = jest.fn(() => ({ send }));
    const next = jest.fn();

    await middleware.use(
      {
        headers: { origin: 'https://sneakereco.test' },
        method: 'OPTIONS',
        url: '/v1/csrf-token',
      } as never,
      {
        header,
        code,
      } as never,
      next,
    );

    expect(header).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      expect.stringContaining('X-App-Surface'),
    );
    expect(code).toHaveBeenCalledWith(204);
    expect(send).toHaveBeenCalled();
  });
});
