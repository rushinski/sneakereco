import { SecurityService } from '../../../../src/core/security/security.service';

describe('SecurityService', () => {
  const service = new SecurityService({
    REQUEST_ID_HEADER: 'x-request-id',
    CORRELATION_ID_HEADER: 'x-correlation-id',
    CSRF_SECRET: 'a'.repeat(32),
  } as never, {
    platformUrl: 'https://sneakereco.test',
    platformDashboardUrl: 'https://dashboard.sneakereco.test',
    staticAllowedOrigins: ['https://sneakereco.test'],
  } as never);

  it('builds coarse runtime CORS policy scaffolding', () => {
    expect(service.getCorsOptions()).toMatchObject({
      credentials: true,
      origin: ['https://sneakereco.test', 'https://dashboard.sneakereco.test'],
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });
  });

  it('builds CSRF and rate-limit scaffolding without feature-specific rules', () => {
    expect(service.getCsrfConfig()).toEqual({
      secret: 'a'.repeat(32),
      cookieName: '__Host-sneakereco.csrf',
      headerName: 'x-csrf-token',
    });

    expect(service.getRateLimitConfig()).toEqual({
      global: {
        ttlSeconds: 60,
        limit: 100,
      },
    });
  });
});