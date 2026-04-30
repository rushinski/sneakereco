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

  it('builds CSRF and route-class rate-limit scaffolding', () => {
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
      profiles: {
        'admin-login': { ttlSeconds: 60, limit: 5 },
        'customer-login': { ttlSeconds: 60, limit: 10 },
        'customer-register': { ttlSeconds: 300, limit: 5 },
        'confirm-email': { ttlSeconds: 300, limit: 10 },
        'forgot-password': { ttlSeconds: 300, limit: 5 },
        'reset-password': { ttlSeconds: 300, limit: 10 },
        'otp-request': { ttlSeconds: 300, limit: 5 },
        'otp-complete': { ttlSeconds: 300, limit: 10 },
        'mfa-challenge': { ttlSeconds: 300, limit: 10 },
        refresh: { ttlSeconds: 60, limit: 30 },
        'onboarding-application': { ttlSeconds: 300, limit: 5 },
        'setup-invitation-consume': { ttlSeconds: 300, limit: 10 },
      },
    });
  });
});