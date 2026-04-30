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
    };
  }
}