import { doubleCsrf } from 'csrf-csrf';

/**
 * Configures the csrf-csrf package using the Double Submit Cookie Pattern.
 *
 * How it works:
 * 1. Frontend calls GET /v1/csrf-token — receives a token in the response body
 *    AND a signed httpOnly cookie is set automatically by csrf-csrf.
 * 2. Frontend stores the token in memory and sends it via the X-CSRF-Token
 *    header on every state-changing request (POST, PUT, PATCH, DELETE).
 * 3. The doubleCsrfProtection middleware validates that the header token
 *    matches the HMAC in the cookie.
 *
 * The cookie is httpOnly (frontend can't read it) — that's fine because the
 * frontend gets the token from the response body, not the cookie. The cookie
 * is only for the server to validate the HMAC.
 *
 * NOTE: The CSRF_SECRET env var is read at module init time. The
 * getSecret callback receives the request but we use a static secret since
 * we're stateless (no sessions). The getSessionIdentifier uses a fixed
 * value because our auth is Bearer-token based — CSRF protection here is
 * defense-in-depth for the httpOnly refresh token cookie.
 */
export function createCsrfConfig(secret: string) {
  return doubleCsrf({
    getSecret: () => secret,
    // We don't use sessions — use a fixed identifier since the HMAC is
    // already bound to the secret. The primary auth mechanism is Bearer
    // tokens; CSRF protects the refresh-token cookie.
    getSessionIdentifier: () => 'sneakereco',
    cookieName: '__Secure-sneakereco.csrf',
    cookieOptions: {
      sameSite: 'none',
      path: '/',
      secure: true,
      httpOnly: true,
      partitioned: true,
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

export function initCsrf(secret: string): void {
  const csrf = createCsrfConfig(secret);
  doubleCsrfProtection = csrf.doubleCsrfProtection;
  generateCsrfToken = csrf.generateCsrfToken;
  invalidCsrfTokenError = csrf.invalidCsrfTokenError;
}