import { Inject, Injectable } from '@nestjs/common';
import type { FastifyHelmetOptions } from '@fastify/helmet';

import type { DomainConfig, Env } from '../config';
import { DOMAIN_CONFIG } from '../config/config.module';
import { ENVIRONMENT } from '../config/config.module';

@Injectable()
export class SecurityService {
  constructor(
    @Inject(ENVIRONMENT) private readonly env: Env,
    @Inject(DOMAIN_CONFIG) private readonly domainConfig: DomainConfig,
  ) {}

  getRequestIdHeader() {
    return this.env.REQUEST_ID_HEADER;
  }

  getCorrelationIdHeader() {
    return this.env.CORRELATION_ID_HEADER;
  }

  getCorsOptions() {
    return {
      origin: [this.domainConfig.platformUrl, this.domainConfig.platformDashboardUrl],
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    };
  }

  getHelmetOptions(): FastifyHelmetOptions {
    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", this.domainConfig.apiBaseUrl, this.domainConfig.platformUrl],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    };
  }

  getCsrfConfig() {
    return {
      secret: this.env.CSRF_SECRET,
      cookieName: '__Host-sneakereco.csrf',
      headerName: 'x-csrf-token',
    };
  }

  getRateLimitConfig() {
    return {
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
    };
  }
  
  hasValidOpsToken(value: string | undefined) {
    return value === this.env.OPS_API_TOKEN;
  }
}