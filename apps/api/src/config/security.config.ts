import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HelmetOptions } from 'helmet';

// ---------------------------------------------------------------------------
// Cookie constants
// ---------------------------------------------------------------------------

export const REFRESH_COOKIE_NAME = '__Secure-sneakereco-refresh';
export const CSRF_COOKIE_NAME = '__Secure-sneakereco-csrf';
export const AUTH_COOKIE_PATH = '/';

export const REFRESH_MAX_AGE = {
  customer: 30 * 24 * 60 * 60 * 1000, // 30 days
  'store-admin': 24 * 60 * 60 * 1000, // 1 day
  'platform-admin': 24 * 60 * 60 * 1000, // 1 day
} as const;

export const CSRF_HEADER_NAME = 'x-csrf-token';

export const CSRF_IGNORED_METHODS = ['GET', 'HEAD', 'OPTIONS'] as const;

// ---------------------------------------------------------------------------
// CORS constants
// ---------------------------------------------------------------------------

export const CORS_CREDENTIALS = true as const;

export const CORS_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Request-ID',
  'X-CSRF-Token',
  'X-Client-Context',
  'X-Tenant-ID',
];

export const CORS_ALLOWED_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

/**
 * Paths that must be reachable from any origin (e.g. the CSRF token endpoint,
 * which the browser fetches before it has established a known origin context).
 * Only safe/read-only methods are allowed; mutations remain origin-restricted.
 */
export const CORS_PUBLIC_PATHS: ReadonlySet<string> = new Set(['/v1/csrf-token']);

// ---------------------------------------------------------------------------
// Rate-limit (throttle) constants
// ---------------------------------------------------------------------------

export const THROTTLE = {
  // Global default — applied to every route that has no @Throttle() override.
  // Generous enough not to affect normal usage.
  default: { ttl: 60_000, limit: 120 },
  // Per-route overrides — referenced directly in @Throttle() decorators.
  auth: { ttl: 60_000, limit: 5 },
  signup: { ttl: 3_600_000, limit: 5 },
  confirmEmail: { ttl: 3_600_000, limit: 10 }, // code submission — brute-forceable
  confirmResend: { ttl: 3_600_000, limit: 3 },
  forgotPassword: { ttl: 3_600_000, limit: 3 },
  resetPassword: { ttl: 3_600_000, limit: 5 }, // code submission — matches forgotPassword
  mfaChallenge: { ttl: 60_000, limit: 5 }, // TOTP brute-force vector
  mfaSetup: { ttl: 60_000, limit: 5 }, // MFA setup completion
  refresh: { ttl: 60_000, limit: 20 },
  onboarding: { ttl: 3_600_000, limit: 5 }, // one-time flow, low volume
  checkout: { ttl: 60_000, limit: 10 },
  apiWrite: { ttl: 60_000, limit: 60 },
  webhook: { ttl: 60_000, limit: 100 },
} as const;

// ---------------------------------------------------------------------------
// Miscellaneous constants
// ---------------------------------------------------------------------------

/** HSTS max-age in seconds (1 year). */
export const HSTS_MAX_AGE = 31_536_000;

/** Request body size limit for JSON and URL-encoded payloads. */
export const BODY_SIZE_LIMIT = '1mb';

/** How long classified CORS origins are cached in Valkey (seconds). */
export const ORIGIN_CACHE_TTL_SECONDS = 300;

// ---------------------------------------------------------------------------
// SecurityConfig — env-dependent values (inject where needed)
// ---------------------------------------------------------------------------

@Injectable()
export class SecurityConfig {
  /**
   * Content-Security-Policy directive map. Building block for helmetOptions —
   * exposed separately so it can be referenced in tests or docs without
   * pulling in the full helmet config.
   */
  readonly cspDirectives: Record<string, string[]>;

  /**
   * Full Helmet options object. Pass directly to helmet() in main.ts.
   * All security header policy decisions live here, not in main.ts.
   */
  readonly helmetOptions: HelmetOptions;

  constructor(config: ConfigService) {
    const isProduction = config.getOrThrow<string>('NODE_ENV') === 'production';

    const r2PublicUrl = config.get<string>('R2_PUBLIC_URL');
    const awsRegion = config.getOrThrow<string>('AWS_REGION');

    this.cspDirectives = {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'tokenization.payrillagateway.com', 'services.nofraud.com'],
      // 'unsafe-inline' is required by Swagger UI (dev only). Dropped in production
      // because the API serves no HTML in prod — only JSON responses.
      styleSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', ...(r2PublicUrl ? [r2PublicUrl] : [])],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      connectSrc: [
        "'self'",
        'tokenization.payrillagateway.com',
        'services.nofraud.com',
        `https://cognito-idp.${awsRegion}.amazonaws.com`,
      ],
      frameSrc: ['tokenization.payrillagateway.com'],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      objectSrc: ["'none'"],
    };

    this.helmetOptions = {
      contentSecurityPolicy: { directives: this.cspDirectives },
      // PayRilla tokenization iframe requires cross-origin embedding
      crossOriginEmbedderPolicy: false,
      // R2 CDN assets must be loadable cross-origin by the browser
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: { maxAge: HSTS_MAX_AGE, includeSubDomains: true },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // Deprecated — modern CSP supersedes it; setting it can harm older browsers
      xXssProtection: false,
    };
  }
}
