import { doubleCsrf } from 'csrf-csrf';

import { AUTH_COOKIE_PATH, CSRF_COOKIE_NAME } from '../../../config/security.config';

/**
 * Configures the csrf-csrf package using the Double Submit Cookie Pattern.
 *
 * How it works:
 * 1. The API generates a token and mirrors it into both the response body and
 *    a non-HttpOnly cookie.
 * 2. The frontend sends that same value via the X-CSRF-Token header on
 *    CSRF-protected requests.
 * 3. csrf-csrf validates that the header value matches the cookie and that the
 *    token HMAC is valid.
 */
export function createCsrfConfig(params: {
  secret: string;
  cookieDomain?: string;
  cookieSecure: boolean;
}) {
  return doubleCsrf({
    getSecret: () => params.secret,
    getSessionIdentifier: () => 'sneakereco',
    cookieName: CSRF_COOKIE_NAME,
    cookieOptions: {
      sameSite: 'none',
      path: AUTH_COOKIE_PATH,
      secure: params.cookieSecure,
      httpOnly: true,
      partitioned: true,
      ...(params.cookieDomain ? { domain: params.cookieDomain } : {}),
    },
    getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  });
}

// These will be initialised in main.ts after config is available.
// Exported as mutable so main.ts can assign them.
export let doubleCsrfProtection: ReturnType<typeof doubleCsrf>['doubleCsrfProtection'];
export let generateCsrfToken: ReturnType<typeof doubleCsrf>['generateCsrfToken'];
export let invalidCsrfTokenError: ReturnType<typeof doubleCsrf>['invalidCsrfTokenError'];

export function initCsrf(params: {
  secret: string;
  cookieDomain?: string;
  cookieSecure: boolean;
}): void {
  const csrf = createCsrfConfig(params);
  doubleCsrfProtection = csrf.doubleCsrfProtection;
  generateCsrfToken = csrf.generateCsrfToken;
  invalidCsrfTokenError = csrf.invalidCsrfTokenError;
}
