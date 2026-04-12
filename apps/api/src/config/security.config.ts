import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ---------------------------------------------------------------------------
// Cookie constants
// ---------------------------------------------------------------------------

export const REFRESH_COOKIE_NAME = '__sneakereco_refresh';
export const REFRESH_COOKIE_PATH = '/v1/auth';
export const PLATFORM_REFRESH_COOKIE_PATH = '/v1/platform/auth';

export const REFRESH_MAX_AGE = {
  customer: 30 * 24 * 60 * 60 * 1000, // 30 days
  admin:     24 * 60 * 60 * 1000,      // 1 day
} as const;

// ---------------------------------------------------------------------------
// CORS constants
// ---------------------------------------------------------------------------

export const CORS_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Request-ID',
  'X-CSRF-Token',
  'X-Tenant-ID',
];

export const CORS_ALLOWED_METHODS = [
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
];

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
  default:        { ttl: 60_000,     limit: 120 },
  // Per-route overrides — referenced directly in @Throttle() decorators.
  auth:           { ttl: 60_000,     limit: 5   },
  signup:         { ttl: 3_600_000,  limit: 5   },
  confirmResend:  { ttl: 3_600_000,  limit: 3   },
  forgotPassword: { ttl: 3_600_000,  limit: 3   },
  refresh:        { ttl: 60_000,     limit: 20  },
  checkout:       { ttl: 60_000,     limit: 10  },
  apiWrite:       { ttl: 60_000,     limit: 60  },
  webhook:        { ttl: 60_000,     limit: 100 },
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
  /** Whether cookies should carry the Secure flag. True in production or when
   *  USE_HTTPS=true (local dev with mkcert + Caddy). */
  readonly cookieSecure: boolean;

  /** Domain attribute for cross-subdomain cookies (e.g. '.sneakereco.com').
   *  Undefined in environments where a shared domain is not needed. */
  readonly cookieDomain: string | undefined;

  /** Pre-built Helmet CSP directives object, ready to pass to helmet(). */
  readonly cspDirectives: Record<string, string[]>;

  constructor(config: ConfigService) {
    const isProduction = config.getOrThrow<string>('NODE_ENV') === 'production';
    // USE_HTTPS is transformed to a boolean by Zod before reaching ConfigService
    const useHttps    = config.get<boolean>('USE_HTTPS') ?? false;

    this.cookieSecure = isProduction || useHttps;
    this.cookieDomain = config.get<string>('COOKIE_DOMAIN');

    const r2PublicUrl = config.get<string>('R2_PUBLIC_URL');
    const awsRegion   = config.getOrThrow<string>('AWS_REGION');

    this.cspDirectives = {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'", 'tokenization.payrillagateway.com', 'services.nofraud.com'],
      styleSrc:      ["'self'", "'unsafe-inline'"],
      imgSrc:        ["'self'", 'data:', 'https:', ...(r2PublicUrl ? [r2PublicUrl] : [])],
      fontSrc:       ["'self'", 'fonts.gstatic.com'],
      connectSrc:    [
        "'self'",
        'tokenization.payrillagateway.com',
        'services.nofraud.com',
        `https://cognito-idp.${awsRegion}.amazonaws.com`,
      ],
      frameSrc:      ['tokenization.payrillagateway.com'],
      frameAncestors: ["'none'"],
      baseUri:       ["'self'"],
      formAction:    ["'self'"],
      objectSrc:     ["'none'"],
    };
  }
}
