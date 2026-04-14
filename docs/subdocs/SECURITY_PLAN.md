# SneakerEco — Security Plan

> **Status:** Implemented and active (with known gaps noted inline).
> See [MASTER_PLAN.md](../MASTER_PLAN.md) § 25 for the summary.
> Auth-specific security (MFA, tokens, cookies, session revocation, rate limiting on auth endpoints) is covered in [AUTH_PLAN.md](./AUTH_PLAN.md).

---

## Table of Contents

1. [Security Configuration — Single Source of Truth](#1-security-configuration--single-source-of-truth)
2. [Security Headers](#2-security-headers)
3. [CORS & Origin Classification](#3-cors--origin-classification)
4. [CSRF Protection](#4-csrf-protection)
5. [Rate Limiting](#5-rate-limiting)
6. [Input Validation](#6-input-validation)
7. [Guards — Global and Per-Route](#7-guards--global-and-per-route)
8. [Tenant Isolation](#8-tenant-isolation)
9. [Webhook Signature Verification](#9-webhook-signature-verification)
10. [Secrets Management](#10-secrets-management)
11. [Dependency Auditing](#11-dependency-auditing)
12. [Audit Trail](#12-audit-trail)
13. [PCI DSS Compliance](#13-pci-dss-compliance)
14. [Known Gaps & Remediation Plan](#14-known-gaps--remediation-plan)

---

## 1. Security Configuration — Single Source of Truth

**File:** `apps/api/src/config/security.config.ts`

All security constants and environment-dependent security values live in this file. Nothing security-related is hardcoded in controllers, middleware, or guards — values are either imported from this file or injected via the `SecurityConfig` service.

### Static Constants (importable anywhere)

| Constant | Value | Used by |
|---|---|---|
| `REFRESH_COOKIE_NAME` | `__sneakereco_refresh` | Auth controllers |
| `REFRESH_COOKIE_PATH` | `/v1/auth` | Auth controller |
| `PLATFORM_REFRESH_COOKIE_PATH` | `/v1/platform/auth` | Tenants controller |
| `REFRESH_MAX_AGE.customer` | 30 days (ms) | Auth controller |
| `REFRESH_MAX_AGE.admin` | 1 day (ms) | Auth controller, Tenants controller |
| `CORS_ALLOWED_HEADERS` | Content-Type, Authorization, X-Request-ID, X-CSRF-Token, X-Tenant-ID | CORS middleware |
| `CORS_ALLOWED_METHODS` | GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS | CORS middleware |
| `CORS_CREDENTIALS` | `true` | CORS middleware (`Access-Control-Allow-Credentials`) |
| `CORS_PUBLIC_PATHS` | `/v1/csrf-token` | CORS middleware |
| `HSTS_MAX_AGE` | 31,536,000 seconds (1 year) | `SecurityConfig.helmetOptions` |
| `BODY_SIZE_LIMIT` | `1mb` | main.ts |
| `ORIGIN_CACHE_TTL_SECONDS` | 300 (5 minutes) | OriginResolverService |
| `THROTTLE.*` | See § 5 | All controllers |

### SecurityConfig Service (env-dependent, injected)

Injected into controllers and middleware that need environment-aware values:

| Property | Source | Effect |
|---|---|---|
| `cookieSecure` | `NODE_ENV === 'production'` or `USE_HTTPS === true` | Sets `Secure` flag on all cookies |
| `cookieDomain` | `COOKIE_DOMAIN` env var | Sets `Domain` on all cookies (enables cross-subdomain sharing) |
| `cspDirectives` | Built from env vars at startup | Pre-built Helmet CSP object |

---

## 2. Security Headers

**Defined in:** `apps/api/src/config/security.config.ts` → `SecurityConfig.helmetOptions`
**Applied in:** `apps/api/src/main.ts` via `helmet(security.helmetOptions)`

All security header policy decisions live in `SecurityConfig`. `main.ts` contains no header logic — it only wires the middleware. CSP directives are built first as `SecurityConfig.cspDirectives` (env-aware), then composed into `helmetOptions` alongside the static header settings.

### Headers Applied

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS for all subdomains for 1 year |
| `Content-Security-Policy` | See below | Restricts resource loading sources |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage on cross-origin navigation |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking protection (CSP `frame-ancestors: none` is stronger and also set) |
| `X-DNS-Prefetch-Control` | `off` | Prevents DNS prefetch leakage |
| `X-Download-Options` | `noopen` | IE-era protection, retained by helmet |
| `X-Permitted-Cross-Domain-Policies` | `none` | Blocks Flash/PDF cross-domain policies |
| `Cross-Origin-Resource-Policy` | `cross-origin` | Required for R2 CDN asset loading |
| `Cross-Origin-Embedder-Policy` | Disabled | Would break PayRilla payment iframe |
| `X-XSS-Protection` | Disabled | Deprecated; CSP supersedes it |

### Content Security Policy

```
default-src 'self'
script-src 'self' tokenization.payrillagateway.com services.nofraud.com
style-src 'self' 'unsafe-inline'
img-src 'self' data: https: [R2_PUBLIC_URL if set]
font-src 'self' fonts.gstatic.com
connect-src 'self' tokenization.payrillagateway.com services.nofraud.com https://cognito-idp.{region}.amazonaws.com
frame-src tokenization.payrillagateway.com
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
object-src 'none'
script-src-attr 'none'
upgrade-insecure-requests
```

**Notable decisions:**
- `frame-src tokenization.payrillagateway.com` — required for the PayRilla hosted payment tokenization iframe
- `frame-ancestors 'none'` — prevents our pages from being embedded in iframes (clickjacking protection)
- `style-src 'unsafe-inline'` — required by current CSS approach; see § 14 for planned removal
- `connect-src` includes the AWS Cognito IDP endpoint for client-side JWKS fetching (if ever needed)

---

## 3. CORS & Origin Classification

**Files:**
- `apps/api/src/common/middleware/cors.middleware.ts`
- `apps/api/src/common/services/origin-resolver.service.ts`

### How It Works

Every cross-origin request's `Origin` header is classified before CORS headers are applied. This is implemented as a custom middleware (not the built-in NestJS `enableCors()`), giving full control over the decision per-request.

### Origin Groups

| Group | Examples | Allowed |
|---|---|---|
| `platform` | `https://sneakereco.com`, `https://dashboard.sneakereco.com` | Yes |
| `tenant` | `https://heatkings.sneakereco.com`, `https://heatkings.com` | Yes |
| `admin` | `https://admin.heatkings.com` | Yes |
| `unknown` | Anything not in the above | No — `403` on preflight, request proceeds but no CORS headers set |

### Classification Logic

```
Origin header arrives
  ↓
Normalize to protocol + host (lowercased)
  ↓
Match against platform origins (PLATFORM_URL, PLATFORM_DASHBOARD_URL) — in-memory Set
  ├─ Match → group: 'platform'
  │
  └─ No match → check Valkey cache (TTL: 5 min)
       ├─ Cache hit → use cached group
       └─ Cache miss → query tenant_domain_config
            ├─ hostname starts with 'admin.' AND matches adminDomain or subdomain pattern → 'admin'
            ├─ hostname matches subdomain.{baseDomain} or customDomain → 'tenant'
            └─ No match → 'unknown'
            → Write result to Valkey cache
```

`baseDomain` is derived from `PLATFORM_URL` at startup (`new URL(PLATFORM_URL).hostname`). Dev and prod use the same code path — the domain changes but the logic doesn't.

### Public Paths

`/v1/csrf-token` is allowed from any origin on safe methods (`GET`, `OPTIONS`) only. This is necessary because the browser fetches the CSRF token before it has established an authenticated session with a known origin. Mutations (`POST`, etc.) on this path are not allowed from unknown origins.

### CORS Response Headers (when allowed)

```
Access-Control-Allow-Origin: {echoed origin}
Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-ID, X-CSRF-Token, X-Tenant-ID
Access-Control-Allow-Methods: GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Credentials: true
Vary: Origin
```

### Cache Invalidation

`OriginResolverService.invalidateOriginCache(hostname)` must be called whenever a tenant's domain configuration changes (create, update, delete). This ensures the 5-minute cache doesn't serve stale classification results. This should be called from any service that writes to `tenant_domain_config`.

---

## 4. CSRF Protection

**Files:**
- `apps/api/src/common/middleware/csrf/csrf.config.ts`
- `apps/api/src/common/guards/csrf.guard.ts`
- `apps/api/src/modules/csrf/csrf.controller.ts`

### Mechanism: Double Submit Cookie Pattern

The `csrf-csrf` library implements a double-submit cookie pattern with HMAC signatures.

**Flow:**

1. Frontend calls `GET /v1/csrf-token` (public, no auth required)
2. API returns `{ token }` in the response body **and** sets an `httpOnly` cookie containing an HMAC-signed version of the same token
3. Frontend stores the token in memory (never in localStorage)
4. On state-changing requests, frontend sends the token in the `X-CSRF-Token` header
5. API verifies: the HMAC in the cookie matches the HMAC derived from the header value
6. If they don't match → 403

### Cookie Settings

| Attribute | Dev | Prod |
|---|---|---|
| Name | `sneakereco.csrf` | `__Host-sneakereco.csrf` |
| `httpOnly` | true | true |
| `SameSite` | `Strict` | `Strict` |
| `Secure` | false | true |
| `__Host-` prefix (prod) | — | Prevents subdomain cookie injection |

### Where CSRF Is Applied

CSRF validation is **not** global — it is applied selectively to the two endpoints that rely on httpOnly cookies for authentication (the refresh endpoints):

| Endpoint | Why |
|---|---|
| `POST /v1/auth/refresh` | Sends httpOnly refresh cookie — classic CSRF target |
| `POST /v1/platform/auth/refresh` | Same for platform admin |

All other mutating endpoints use `Authorization: Bearer {accessToken}`. Bearer tokens are not sent automatically by browsers and therefore cannot be CSRF'd. Applying CSRF validation to Bearer-protected endpoints would be redundant.

### Why Not Global CSRF

Applying `CsrfGuard` globally would require the frontend to fetch and send a CSRF token on every request including Bearer-authenticated ones. This adds unnecessary complexity with no security benefit for those endpoints.

---

## 5. Rate Limiting

**Files:**
- `apps/api/src/config/security.config.ts` — all `THROTTLE.*` constants
- `apps/api/src/common/guards/custom-throttler.guard.ts`
- `apps/api/src/app.module.ts` — ThrottlerModule configuration

### Infrastructure

Rate limiting is distributed via Valkey (Redis-compatible). Limits are not in-process — they persist across restarts and are shared across API instances in multi-node deployments. The `CustomThrottlerGuard` constructs a composite key per request:

| Request context | Rate limit key |
|---|---|
| Authenticated request | `{tenantId}:{userId}` |
| Unauthenticated, tenant-scoped | `{tenantId}:{ip}` |
| Platform routes (no tenant) | `{ip}` |

### Limits

| Profile | Limit | Applied to |
|---|---|---|
| `default` | 120 / min | Global baseline for all undecorated routes |
| `auth` | 5 / min | `POST /v1/auth/sign-in` |
| `signup` | 5 / hour | `POST /v1/auth/signup` |
| `confirmResend` | 3 / hour | `POST /v1/auth/confirm/resend` |
| `forgotPassword` | 3 / hour | `POST /v1/auth/forgot-password` |
| `refresh` | 20 / min | `POST /v1/auth/refresh`, `POST /v1/platform/auth/refresh` |
| `checkout` | 10 / min | Checkout endpoints (not yet implemented) |
| `apiWrite` | 60 / min | General write operations |
| `webhook` | 100 / min | Webhook receiver endpoints |

All `THROTTLE.*` values are defined in `security.config.ts`. No rate limits are hardcoded at the call site — controllers import and reference the constant by name.

### Known Gaps

Several sensitive endpoints fall back to the global default (120/min), which is too permissive. See § 14.

---

## 6. Input Validation

**Files:**
- `apps/api/src/common/pipes/zod-validation.pipe.ts`
- Per-module DTO schemas (e.g. `apps/api/src/modules/auth/dto/*.ts`)

### Pattern

Every endpoint that accepts a request body uses `@Body(new ZodValidationPipe(schema))`. No body reaches business logic without passing a Zod schema. Zod errors are flattened and returned as `400 BadRequestException` with per-field messages.

Validation is at the API boundary only — internal service-to-service calls within the same process are trusted and not re-validated.

### Environment Validation

`apps/api/src/config/env.schema.ts` validates all environment variables at startup using Zod. The API will not start if a required variable is missing or malformed. This prevents misconfiguration from reaching runtime.

---

## 7. Guards — Global and Per-Route

**Directory:** `apps/api/src/common/guards/`

### Global Guards (applied to every request, in order)

| Guard | File | Purpose |
|---|---|---|
| `JwtAuthGuard` | `auth.guard.ts` | Validates Cognito JWT, resolves `AuthenticatedUser`. Bypassed by `@Public()`. |
| `TenantGuard` | `tenant.guard.ts` | Sets tenant context from JWT or `X-Tenant-ID` header. Skips public routes. |
| `RolesGuard` | `roles.guard.ts` | Checks `@Roles()` decorator against resolved user role. No-op if no decorator. |
| `CustomThrottlerGuard` | `custom-throttler.guard.ts` | Distributed rate limiting via Valkey. |

### Selective Guards (applied per-route)

| Guard | File | Applied to |
|---|---|---|
| `CsrfGuard` | `csrf.guard.ts` | `POST /v1/auth/refresh`, `POST /v1/platform/auth/refresh` |
| `PlatformAdminGuard` | `platform-admin.guard.ts` | Platform management routes (`/v1/platform/requests/*`) |
| `OnboardingOriginGuard` | `onboarding-origin.guard.ts` | `POST /v1/platform/auth/sign-in` — validates origin is platform |
| `WebhookGuard` | `webhook.guard.ts` | Webhook endpoints (defined, not yet deployed to any route) |

### Guard Ordering

Guards run in the order they appear in the `providers` array in `app.module.ts`. The current order is deliberate: JWT validation happens before tenant context is set, which happens before role checks, which happens before rate limiting. This ensures that rate limit keys can use the resolved user and tenant IDs from earlier guards.

### Decorators

| Decorator | File | Effect |
|---|---|---|
| `@Public()` | `public.decorator.ts` | Skips `JwtAuthGuard`, `TenantGuard`, `RolesGuard` |
| `@PlatformAdmin()` | `platform-admin.decorator.ts` | Marks route for `PlatformAdminGuard` — requires `isSuperAdmin: true` from platform origin |
| `@OnboardingOnly()` | `onboarding-only.decorator.ts` | Marks route for `OnboardingOriginGuard` — requires platform origin |
| `@Roles()` | `roles.decorator.ts` | Marks route with required roles for `RolesGuard` |
| `@WebhookAuth()` | `webhook-auth.decorator.ts` | Marks route for `WebhookGuard` with the expected signature header name |
| `@SkipThrottle()` | NestJS throttler | Bypasses `CustomThrottlerGuard` (used on health check) |

---

## 8. Tenant Isolation

Tenant isolation is enforced at multiple layers. Each layer is defense-in-depth — no single layer is the sole protection.

### Layer 1 — PostgreSQL Row-Level Security (RLS)

The primary enforcement mechanism. Every table that contains per-tenant data has an RLS policy that filters rows to the current tenant context. The application uses two database roles:

- `sneakereco_app` — the default role used for tenant-scoped requests. RLS applies.
- `sneakereco_system` — bypasses RLS. Used only for operations that legitimately need cross-tenant access (onboarding, platform admin reads). Never used for tenant-initiated requests.

Tenant context is set per-connection via a `SET LOCAL` SQL statement before executing tenant-scoped queries. If a bug in application code fails to set context, RLS returns no rows rather than the wrong tenant's rows.

### Layer 2 — JWT Issuer Binding

Every access token is cryptographically bound to the Cognito pool that issued it. Tokens from tenant A's pool cannot authenticate against tenant B's pool because the `iss` claim encodes the pool ID and `JwtStrategy` validates it against the known pool registry.

### Layer 3 — Membership Lookup

For tenant tokens, `JwtStrategy` resolves the `tenantId` from `tenant_members` by `cognitoSub`. A user's token only carries authority for the tenant they are a member of. Cross-tenant access by a regular user is not possible even if they obtain another tenant's `tenantId` — the JWT won't match.

### Layer 4 — X-Tenant-ID as Routing Hint Only

`X-Tenant-ID` is used to resolve the correct Cognito pool for unauthenticated requests (sign-in, signup). For authenticated requests, the tenant is resolved from the JWT, not the header. The header is not a trust boundary for authenticated routes.

---

## 9. Webhook Signature Verification

**File:** `apps/api/src/common/guards/webhook.guard.ts`

### Mechanism

HMAC-SHA256 signatures. The guard:
1. Reads the raw request body (before JSON parsing) and the signature from the header specified by `@WebhookAuth('x-signature-header')`
2. Computes `HMAC-SHA256(body, webhookSecret)` using the secret attached to `request.webhookSecret` by the controller
3. Compares using `crypto.timingSafeEqual` — constant-time comparison prevents timing attacks

### Status

The guard is implemented and ready. No webhook endpoints are deployed yet. When `POST /v1/webhooks/payrilla` and `POST /v1/webhooks/shippo` are built, they must:
1. Decorate the handler with `@WebhookAuth('x-payrilla-signature')` (or equivalent)
2. Use `@UseGuards(WebhookGuard)`
3. Attach the correct secret to `req.webhookSecret` before the guard runs (via a per-tenant middleware or resolver)

Raw body access requires that the NestJS body parser is configured to preserve `rawBody` on the request — this must be confirmed when webhook routes are implemented.

---

## 10. Secrets Management

### Development

Secrets are managed via **Doppler** (same tool as production, different environment). The `.env` file in the repo is used only as a fallback for contributors who haven't set up Doppler — it contains placeholder values only and is git-ignored. The `env.schema.ts` Zod schema validates all required secrets are present at startup regardless of source.

### Production

- **Application secrets** (API keys, CSRF secret, database URLs) → Doppler. Injected as environment variables at deploy time. Doppler supports secret rotation and audit logs.
- **Per-tenant secrets** (PayRilla API keys, Shippo tokens) → AWS SSM Parameter Store, namespaced by tenant ID. Fetched at runtime, not injected at startup.

### Principles

- No secret is committed to git. `.env.example` contains placeholder values only.
- Secrets are never logged. The Pino logger config must be audited to ensure no request body or header logging captures secrets.
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` are the IAM credentials used to authenticate all AWS SDK calls (Cognito, SES, SSM). These are scoped to the minimum required permissions (principle of least privilege).

---

## 11. Dependency Auditing

- `pnpm audit` is run in CI on every pull request. Build fails on high-severity vulnerabilities.
- Renovate (or Dependabot) is configured for automated dependency update PRs.
- Node.js version is pinned in `.nvmrc` / `package.json` engines field and updated deliberately.

---

## 12. Audit Trail

**Table:** `audit_events`

All admin-initiated actions (approve request, deny request, invite resend, tenant suspension, etc.) are recorded in `audit_events`. The table has:

- Append-only design — no `DELETE` RLS policy on `audit_events`
- Timestamps, actor ID, action type, target entity, and metadata (JSON)
- System-context writes only (bypasses RLS to ensure cross-tenant audit completeness)

Customer actions (orders, address changes, etc.) are not in `audit_events` — they are recorded in their respective domain tables with `created_at` / `updated_at` columns.

---

## 13. PCI DSS Compliance

SneakerEco targets **SAQ A** compliance — the lowest scope tier, applicable when card data handling is fully outsourced.

- Card numbers, CVVs, and expiry dates **never touch our servers**. The PayRilla hosted tokenization iframe collects card data directly; our servers only receive a payment token.
- The `frame-src tokenization.payrillagateway.com` CSP directive allows the PayRilla iframe while blocking all other iframe embeds.
- `connect-src` includes `tokenization.payrillagateway.com` and `services.nofraud.com` for client-side payment and fraud API calls.
- `Cross-Origin-Embedder-Policy` is disabled because the PayRilla iframe requires cross-origin resource sharing that COEP would block.

---

## 14. Known Gaps & Remediation Plan

### ~~Gap 1 — Missing Rate Limits on Sensitive Endpoints~~ ✓ Resolved

All auth and onboarding endpoints now have explicit `@Throttle()` decorators. New profiles added to `security.config.ts`: `confirmEmail`, `resetPassword`, `mfaChallenge`, `mfaSetup`, `onboarding`. Applied to: `POST /v1/auth/confirm`, `POST /v1/auth/reset-password`, `POST /v1/auth/mfa/challenge`, `POST /v1/auth/mfa/setup/associate`, `POST /v1/auth/mfa/setup/complete`, `POST /v1/platform/auth/sign-in`, `POST /v1/platform/auth/refresh`, `POST /v1/platform/auth/mfa/challenge`, `POST /v1/platform/auth/mfa/setup/associate`, `POST /v1/platform/auth/mfa/setup/complete`, `POST /v1/onboarding/request`, `POST /v1/onboarding/complete`.

### Gap 2 — CSP `style-src 'unsafe-inline'`

**Issue:** Inline styles are allowed, weakening XSS protection for style injection.

**Remediation:** Move to external stylesheets or adopt a nonce-based CSP. Low priority while the frontend is pre-launch, but must be addressed before public release.

### Gap 3 — Tenant Admin MFA Not Technically Enforced

**Issue:** The tenant pool's `MfaConfiguration: 'OPTIONAL'` means a tenant admin account created outside the onboarding flow can sign in without MFA. See AUTH_PLAN.md § 11.

**Remediation:** Add a post-authentication guard that checks the Cognito user's MFA status on every admin API request. Block with `403` if no TOTP device is registered. Implement when admin account management features are built.

### Gap 4 — CORS Cache Not Invalidated on Domain Config Changes

**Issue:** `OriginResolverService` caches origin classifications for 5 minutes in Valkey. If a tenant's custom domain is added, changed, or removed, the cache may serve stale results for up to 5 minutes.

**Remediation:** Call `OriginResolverService.invalidateOriginCache(hostname)` from any service that writes to `tenant_domain_config`. This call exists but is not consistently wired to all write paths.

### Gap 5 — `OnboardingOriginGuard` Not Applied to Platform MFA Routes

**Issue:** `@OnboardingOnly()` (which restricts to platform origins) is only on `POST /v1/platform/auth/sign-in`. The subsequent MFA challenge and setup routes are callable from any allowed origin.

**Assessment:** Low risk — these routes require a valid Cognito session token issued by the platform sign-in endpoint. Without completing a valid sign-in, the session is useless. However, for defense-in-depth, origin restriction should be consistent.

**Remediation:** Apply `@OnboardingOnly()` to `POST /v1/platform/auth/mfa/*` routes.

### Gap 6 — No Membership Cache Invalidation Endpoint

**Issue:** Role changes, admin removal, and tenant suspension take up to 60 minutes to take effect due to the JwtStrategy membership cache. See AUTH_PLAN.md § 15.

**Remediation:** Implement a cache eviction call in membership-change service methods, or add a platform admin endpoint to force-evict a user's cached membership entry.
