# SneakerEco — Authentication Plan

> **Status:** Implemented and active.
> See [MASTER_PLAN.md](../MASTER_PLAN.md) § 5 for the original architecture decision rationale.
> This document is the authoritative reference for everything auth-related: Cognito configuration, token flows, cookie strategy, API layer, frontend integration, and isolation guarantees.

> **Domain examples used in this document:** `heatkings` is used as the representative tenant slug and `heatkings.com` / `admin.heatkings.com` as the representative custom domain pair. In practice, a tenant's custom domain is whatever they configure — it could be `store.heatkings.com`, `kicks.somebrand.com`, etc. The `admin.` prefix on a custom domain is the convention for distinguishing the admin interface from the storefront when a tenant brings their own domain.

---

## Table of Contents

1. [Three User Types — Overview](#1-three-user-types--overview)
2. [Token Storage Contract](#2-token-storage-contract)
3. [Platform Admin](#3-platform-admin)
4. [Tenant Admin](#4-tenant-admin)
5. [Customer](#5-customer)
6. [Tenant Pool Creation](#6-tenant-pool-creation)
7. [API Layer — JwtStrategy](#7-api-layer--jwtstrategy)
8. [API Layer — Endpoints](#8-api-layer--endpoints)
9. [Cookie Configuration](#9-cookie-configuration)
10. [CORS & Origin Classification](#10-cors--origin-classification)
11. [MFA Policy Enforcement](#11-mfa-policy-enforcement)
12. [Platform Admin Login at Tenant Dashboards](#12-platform-admin-login-at-tenant-dashboards)
13. [Flow Isolation Guarantees](#13-flow-isolation-guarantees)
14. [Environment Variables](#14-environment-variables)

---

## 1. Three User Types — Overview

Three completely distinct user types exist. They never share a Cognito pool (customers and tenant admins share a *per-tenant* pool, but that pool is completely isolated from every other tenant and from the platform pool). No user can cross into another type's session — isolation is enforced at the Cognito pool level, the cookie path level, and the JWT strategy level.

| | Platform Admin | Tenant Admin | Customer |
|---|---|---|---|
| Who | SneakerEco operator | Store owner, approved by platform admin | End shopper |
| Cognito pool | Platform pool (manual, shared) | Per-tenant pool (programmatic) | Same pool as tenant admin |
| App client | Platform admin client | Tenant admin client | Tenant customer client |
| Creation | Manual in AWS console | Programmatic on tenant approval | Self-registration on storefront |
| Login URL | `dashboard.sneakereco.com/login` (.test in dev) | `{slug}.sneakereco.com/admin/login` or `admin.tenant.com/login` (.test in dev) | `{slug}.sneakereco.com/login` or `tenant.com/login` (.test in dev) |
| Frontend app | `apps/platform` | `apps/web` (`/admin/*`) | `apps/web` (storefront) |
| MFA | Required (TOTP) | Required (TOTP, enforced programmatically) | Optional (TOTP, user-controlled) |
| Refresh TTL | 1 day | 1 day | 30 days |
| Access token TTL | 60 min | 60 min | 60 min |
| Cookie path | `/v1/platform/auth` | `/v1/auth` | `/v1/auth` |
| `isSuperAdmin` | `true` | `false` | `false` |
| Identity resolution | JWT issuer alone — no DB | DB lookup (`tenant_members`) | DB lookup (`tenant_members`) |

---

## 2. Token Storage Contract

**This contract applies uniformly across all three channels (platform dashboard, tenant admin, customer storefront):**

- **Refresh token** → `httpOnly` cookie, set by the API on successful sign-in or MFA completion. Never readable by JavaScript. Path-scoped so it is only sent to the refresh endpoint.
- **Access token** → Returned in the response body. Stored in memory only (React state / module-level variable). Never written to `localStorage` or `sessionStorage`.
- **ID token** → Returned in the response body alongside the access token. Used for display purposes only (email, name). Not sent to the API.

When the access token expires, the frontend calls the refresh endpoint. The browser automatically attaches the httpOnly refresh cookie. The API returns a new access token in the body.

---

## 3. Platform Admin

### Who

The SneakerEco operator. A small number of manually created accounts. Manages tenant onboarding approvals from the platform dashboard.

### Cognito Pool

| Setting | Value |
|---|---|
| Creation | **Manual** — created once in the AWS console, never touched by code |
| Pool ID | `PLATFORM_COGNITO_POOL_ID` env var |
| App client | **Manual** — created once in the AWS console |
| App client ID | `PLATFORM_COGNITO_ADMIN_CLIENT_ID` env var |
| App client type | Public (no secret) |
| Auth flows | `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH` |
| MFA | **Required** — TOTP authenticator app only |
| Device tracking | Do not remember devices |
| Self-registration | **Disabled** |
| User account recovery | **Disabled** |
| Sign-in methods | Email + password |
| Access token TTL | 60 minutes |
| Refresh token TTL | 1 day |

> MFA is Required (not Optional) on the platform pool. A platform admin account that has not completed TOTP setup cannot sign in — Cognito will return an `MFA_SETUP` challenge which must be completed before the session is established.

### Sign-in Flow

```
User: dashboard.sneakereco.com/login
  ↓
POST /v1/platform/auth/sign-in
  { email, password }
  → TenantsService.signInAdmin()
  → CognitoService.signIn()  [no pool arg — uses platformAdminClientId]
  → Cognito platform pool

  ← If MFA already set up:
       { type: 'mfa_required', session }
     → POST /v1/platform/auth/mfa/challenge
       { email, session, mfaCode }
       ← { accessToken, idToken, expiresIn }
          + __sneakereco_refresh cookie (path: /v1/platform/auth, maxAge: 1 day)

  ← If MFA not yet set up (first login):
       { type: 'mfa_setup', session, email }
     → POST /v1/platform/auth/mfa/setup/associate
       { session }
       ← { secretCode, session }  — display QR code
     → POST /v1/platform/auth/mfa/setup/complete
       { email, session, mfaCode }
       ← { accessToken, idToken, expiresIn }
          + __sneakereco_refresh cookie
```

### Token Refresh

```
POST /v1/platform/auth/refresh  (CSRF-protected)
  → reads __sneakereco_refresh cookie (path: /v1/platform/auth)
  → CognitoService.refreshTokens()  [platform client]
  ← { accessToken, idToken, expiresIn }
```

---

## 4. Tenant Admin

### Who

The business owner who submitted an account request and was approved by the platform admin. Manages their store's inventory, orders, and settings.

### Cognito Pool

Tenant admins and customers share a single per-tenant Cognito pool, but use separate app clients. The pool is created programmatically at approval time.

| Setting | Value |
|---|---|
| Creation | **Programmatic** — `CognitoService.createTenantPool()` at approval time |
| Pool ID | Stored in `tenant_cognito_config.user_pool_id` |
| MFA | `OPTIONAL` at the pool level — enforced to Required for admins programmatically (see § 11) |
| MFA method | TOTP authenticator app only |
| Device tracking | Do not remember devices |
| Self-registration | Enabled (customers register themselves; admin accounts are created by the platform) |
| User account recovery | Enabled — email delivery only, no SMS |
| Sign-in methods | Email + password, or email OTP (choice-based) |
| App client | `admin` client, created during pool setup |
| Admin client auth flows | `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_USER_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH` |
| Auth flow session duration | 10 minutes |
| Admin access token TTL | 60 minutes |
| Admin refresh token TTL | 1 day |
| Admin ID token TTL | 60 minutes |

### Account Creation

1. Tenant submits an account request at `sneakereco.com/request` (dev: `.test`)
2. Platform admin approves in dashboard
3. `OnboardingService.approveRequest()`:
   - Resolves a unique subdomain slug
   - `CognitoService.createTenantPool()` — creates Cognito pool + admin client + customer client
   - Inserts pool IDs into `tenant_cognito_config`
   - Creates `tenant_domain_config` row (subdomain, adminDomain)
   - Sends invite email to business owner with link: `https://{slug}.{platformHost}/admin/setup/{inviteToken}`

### Onboarding Completion (first-time account setup)

Business owner clicks invite link → `POST /v1/onboarding/complete`:
1. Validates invite token against DB
2. `CognitoService.createAdminUser()` — creates Cognito user in tenant pool with temp password, forces to permanent password
3. Creates `users` row (cognitoSub)
4. Creates `tenant_members` row (role: `admin`, isOwner: `true`)
5. Signs them in immediately, returns a `secretCode` for TOTP QR setup
6. Redirects to `https://{adminDomain}/admin` where QR setup completes

### Sign-in Flow (subsequent logins)

```
User: heatkings.sneakereco.com/admin/login  (or admin.heatkings.com/login on a custom domain)
  ↓
POST /v1/auth/sign-in
  { email, password, clientType: 'admin' }
  X-Tenant-ID: {tenantId}
  → AuthService.signIn()
  → Resolves admin client from tenant_cognito_config
  → CognitoService.signIn()  [tenant admin client]

  ← { type: 'mfa_required', session }
  → POST /v1/auth/mfa/challenge
    { email, session, mfaCode, clientType: 'admin' }
    X-Tenant-ID: {tenantId}
    ← { accessToken, idToken, expiresIn }
       + __sneakereco_refresh cookie (path: /v1/auth, maxAge: 1 day)
```

> The `X-Tenant-ID` header is resolved client-side in the browser. The Next.js middleware injects `x-tenant-slug` from the hostname into server-side headers; the login page passes that slug as a prop to the client component, which calls `GET /v1/platform/config?slug=...` on mount to resolve the tenant ID before the sign-in button is enabled.

### MFA Setup During Sign-in

If a tenant admin account has not yet set up TOTP (edge case — normally completed at onboarding), Cognito returns `MFA_SETUP`:

```
← { type: 'mfa_setup', session, email }
→ POST /v1/auth/mfa/setup/associate
  { session }
  X-Tenant-ID: {tenantId}
  ← { secretCode, session }  — display QR
→ POST /v1/auth/mfa/setup/complete
  { email, session, mfaCode }
  X-Tenant-ID: {tenantId}
  ← { accessToken, idToken, expiresIn }
     + __sneakereco_refresh cookie
```

### Token Refresh

```
POST /v1/auth/refresh
  X-Tenant-ID: {tenantId}
  { clientType: 'admin' }
  → reads __sneakereco_refresh cookie (path: /v1/auth)
  → CognitoService.refreshTokens()  [tenant admin client]
  ← { accessToken, idToken, expiresIn }
```

---

## 5. Customer

### Who

End shoppers who create accounts on a tenant's storefront.

### Cognito Pool

Shares the same per-tenant Cognito pool as the tenant admin but uses the **customer** app client. The `clientType` field in API requests and `tenant_members.role` in the DB are the only distinguishing factors within the pool.

| Setting | Value |
|---|---|
| App client | `customer` client, created during pool setup |
| Customer client auth flows | `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_USER_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH` |
| Auth flow session duration | 10 minutes |
| Customer access token TTL | 60 minutes |
| Customer refresh token TTL | 30 days |
| Customer ID token TTL | 60 minutes |
| MFA | Optional — user-controlled via `/auth/mfa/*` endpoints after sign-in |

### Registration Flow

```
User: {slug}.sneakereco.com/signup
  ↓
POST /v1/auth/signup
  { email, password }
  X-Tenant-ID: {tenantId}
  → Cognito creates UNCONFIRMED user, sends 6-digit verification code to email

User enters code:
  ↓
POST /v1/auth/confirm
  { email, code }
  X-Tenant-ID: {tenantId}
  → Cognito confirms user
  → Creates users row in DB (cognitoSub stored)
  ← { success: true }
```

Email verification is required before a customer can sign in. `UserNotConfirmedException` from Cognito is caught and returned as a 400 error pointing to the resend endpoint.

### Sign-in Flow

```
POST /v1/auth/sign-in
  { email, password }  (clientType omitted — defaults to 'customer')
  X-Tenant-ID: {tenantId}
  → AuthService.signIn()
  → Resolves customer client from tenant_cognito_config
  → CognitoService.signIn()  [tenant customer client]
  ← { accessToken, idToken, expiresIn }
     + __sneakereco_refresh cookie (path: /v1/auth, maxAge: 30 days)
```

### Token Refresh

```
POST /v1/auth/refresh
  X-Tenant-ID: {tenantId}
  { clientType: 'customer' }
  → reads __sneakereco_refresh cookie (path: /v1/auth)
  → CognitoService.refreshTokens()  [tenant customer client]
  ← { accessToken, idToken, expiresIn }
```

### MFA (optional)

Customers may optionally enable TOTP after signing in:

```
POST /v1/auth/mfa/associate   (Bearer: accessToken)
  ← { secretCode }  — display QR

POST /v1/auth/mfa/verify   (Bearer: accessToken)
  { mfaCode }
  → Enables TOTP MFA on the Cognito user
```

---

## 6. Tenant Pool Creation

Called once per tenant during `OnboardingService.approveRequest()`. Implemented in `CognitoService.createTenantPool()`.

**Steps in order:**

1. **`CreateUserPoolCommand`**
   - `MfaConfiguration: 'OFF'` at creation — avoids Cognito requiring SMS config. TOTP is enabled in step 2.
   - `AutoVerifiedAttributes: ['email']` — email verification required for self-registered users
   - `AccountRecoverySetting`: `verified_email` only — no SMS fallback
   - `DeviceConfiguration`: `ChallengeRequiredOnNewDevice: false`, `DeviceOnlyRememberedOnUserPrompt: false` — don't remember devices
   - `UsernameAttributes: ['email']` — email is the sign-in identifier
   - `Policies.SignInPolicy.AllowedFirstAuthFactors: ['PASSWORD', 'EMAIL_OTP']` — enables choice-based sign-in

2. **`SetUserPoolMfaConfigCommand`**
   - `MfaConfiguration: 'OPTIONAL'`
   - `SoftwareTokenMfaConfiguration: { Enabled: true }`
   - TOTP only — no SMS ever configured

3. **`CreateUserPoolClientCommand`** — `customer` client
   - `ExplicitAuthFlows: ['ALLOW_USER_PASSWORD_AUTH', 'ALLOW_USER_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH']`
   - `AuthSessionValidity: 10` (minutes)
   - `RefreshTokenValidity: 30` (days)
   - `AccessTokenValidity: 60` (minutes)
   - `IdTokenValidity: 60` (minutes)
   - `PreventUserExistenceErrors: 'ENABLED'`

4. **`CreateUserPoolClientCommand`** — `admin` client
   - `ExplicitAuthFlows: ['ALLOW_USER_PASSWORD_AUTH', 'ALLOW_USER_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH']`
   - `AuthSessionValidity: 10` (minutes)
   - `RefreshTokenValidity: 1` (day)
   - `AccessTokenValidity: 60` (minutes)
   - `IdTokenValidity: 60` (minutes)
   - `PreventUserExistenceErrors: 'ENABLED'`

Returns `{ userPoolId, userPoolArn, customerClientId, adminClientId, region }`.

---

## 7. API Layer — JwtStrategy

**File:** `apps/api/src/modules/auth/jwt.strategy.ts`

A single `passport-jwt` strategy handles all three user types. The strategy decodes the JWT header and payload before verification to extract the `iss` (issuer) and `kid` (key ID), then fetches the correct JWKS endpoint to verify the signature.

### Branching Logic

```
JWT arrives at any protected endpoint
  ↓
Decode iss (issuer URL), kid (key ID) — unverified
  ↓
iss === platform pool URL?
  ├─ YES → fetch JWKS from platform pool
  │        verify signature
  │        validate: token_use === 'access', client_id === platformAdminClientId
  │        return { isSuperAdmin: true, role: 'admin', tenantId: undefined }
  │        NO DB LOOKUP
  │
  └─ NO  → extract poolId from iss (last URL segment)
           look up tenant_cognito_config by poolId → reject if unknown
           cache customer/admin clientIds in memory
           fetch JWKS from tenant pool
           verify signature
           validate: token_use === 'access', client_id in {customer, admin}
           look up tenant_members by cognitoSub (cached 60 min)
           return { isSuperAdmin: false, role: 'admin'|'customer', tenantId, memberId }
```

### Membership Cache

To avoid a DB round-trip on every authenticated request, resolved tenant memberships are cached in memory for 60 minutes (matching the access token TTL). When the access token is refreshed, the next request either hits the cache (still valid) or re-queries the DB if the cache entry has expired. Role changes take effect at most 60 minutes after they are applied.

---

## 8. API Layer — Endpoints

### Platform Admin Auth (`/v1/platform/auth/*`)

All platform auth endpoints are `@Public()` (exempt from JWT guard) and callable only from platform/dashboard origins (enforced by CORS + the `@OnboardingOnly()` decorator on sign-in).

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/platform/auth/sign-in` | Password sign-in → tokens or MFA challenge |
| `POST` | `/v1/platform/auth/refresh` | Refresh access token (reads httpOnly cookie, CSRF-protected) |
| `POST` | `/v1/platform/auth/mfa/challenge` | Complete TOTP sign-in challenge |
| `POST` | `/v1/platform/auth/mfa/setup/associate` | Begin TOTP setup (session-based, no access token yet) |
| `POST` | `/v1/platform/auth/mfa/setup/complete` | Verify TOTP and complete setup, returns tokens |

### Tenant/Customer Auth (`/v1/auth/*`)

All require `X-Tenant-ID` header. `clientType: 'admin' | 'customer'` in the body determines which Cognito client is used.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/auth/sign-in` | Password sign-in → tokens, MFA challenge, or MFA setup |
| `POST` | `/v1/auth/mfa/challenge` | Complete TOTP challenge |
| `POST` | `/v1/auth/mfa/setup/associate` | Begin TOTP setup during sign-in challenge |
| `POST` | `/v1/auth/mfa/setup/complete` | Verify TOTP and complete setup, returns tokens |
| `POST` | `/v1/auth/refresh` | Refresh tokens (reads httpOnly cookie, CSRF-protected) |
| `POST` | `/v1/auth/signup` | Customer self-registration |
| `POST` | `/v1/auth/confirm` | Confirm email with 6-digit code |
| `POST` | `/v1/auth/confirm/resend` | Resend confirmation code |
| `POST` | `/v1/auth/forgot-password` | Request password reset code |
| `POST` | `/v1/auth/reset-password` | Set new password with reset code |
| `POST` | `/v1/auth/sign-out` | Global sign-out (Bearer required) |
| `POST` | `/v1/auth/mfa/associate` | Begin TOTP setup post-login (Bearer required) |
| `POST` | `/v1/auth/mfa/verify` | Activate TOTP (Bearer required) |
| `POST` | `/v1/auth/mfa/enable` | Enable MFA preference (Bearer required) |
| `POST` | `/v1/auth/mfa/disable` | Disable MFA preference (Bearer required) |

---

## 9. Cookie Configuration

Cookie name: `__sneakereco_refresh`

| Attribute | Platform Admin | Tenant Admin | Customer |
|---|---|---|---|
| `Path` | `/v1/platform/auth` | `/v1/auth` | `/v1/auth` |
| `Max-Age` | 1 day | 1 day | 30 days |
| `HttpOnly` | ✓ | ✓ | ✓ |
| `Secure` | `true` in prod / when `USE_HTTPS=true` | same | same |
| `SameSite` | `Strict` | `Strict` | `Strict` |
| `Domain` | `COOKIE_DOMAIN` env var | same | same |

### What each attribute does

**`HttpOnly`** — Prevents JavaScript from reading the cookie via `document.cookie`. This is the primary XSS defense for the refresh token. Even if an attacker injects a script into the page, they cannot steal the refresh token. The access token (stored in memory) is what gets stolen in an XSS attack, but it expires in 60 minutes, limiting the damage window.

**`Secure`** — Instructs the browser to only send the cookie over HTTPS. In local dev this is only set when `USE_HTTPS=true` (i.e. when running behind Caddy with a real TLS cert). Without it, the cookie wouldn't be sent on `http://localhost` if `Secure` were always on.

**`SameSite: Strict`** — The browser will not send this cookie on any cross-site request, including cross-site form submissions and navigations. This is the primary CSRF defense. Combined with double-submit CSRF tokens on mutating endpoints, CSRF attacks against the refresh endpoint are blocked at two layers.

**`Path`** — Scopes the cookie to a URL prefix. The browser only attaches the cookie to requests whose URL starts with this path. This is what separates platform and tenant refresh cookies even though they share the same cookie name:
- Platform admin cookie (`/v1/platform/auth`) is never sent to `/v1/auth/refresh`
- Tenant/customer cookie (`/v1/auth`) is never sent to `/v1/platform/auth/refresh`

**`Domain`** — Set to the value of `COOKIE_DOMAIN` (e.g. `.sneakereco.test` in dev, `.sneakereco.com` in prod). The leading dot makes the cookie available to all subdomains of that domain. This is necessary because the API is at `api.sneakereco.com` but the cookie is set by responses from that API and needs to be sent back to it from any subdomain (e.g. `heatkings.sneakereco.com` hitting the API).

**`Max-Age`** — How long the browser keeps the cookie before deleting it. This is the refresh token's effective lifetime from the user's perspective. See below.

### Refresh token duration — UX implications

The `Max-Age` controls how long a user stays "logged in" without re-entering their credentials:

- **Platform admin (1 day):** The platform admin must re-authenticate once per day. Given that this is a sensitive privileged account with access to all tenants, a short session is intentional.
- **Tenant admin (1 day):** Same reasoning — store management is a privileged operation.
- **Customer (30 days):** Customers get a 30-day session. If they visit a store and sign in, they remain signed in for a month of inactivity. This matches the expectation of a normal e-commerce sign-in experience (comparable to "stay signed in" on most consumer apps).

When `Max-Age` expires, the browser discards the cookie. The next time the frontend tries to refresh the access token, the API receives no cookie and returns 401. The user is sent back to the login page. They must sign in from scratch — there is no "silent re-authentication" path.

---

## 10. CORS & Origin Classification

**File:** `apps/api/src/common/services/origin-resolver.service.ts`

Every cross-origin request has its `Origin` header classified into one of four groups:

| Group | Example origins | Allowed |
|---|---|---|
| `platform` | `https://sneakereco.com`, `https://dashboard.sneakereco.com` | Yes |
| `tenant` | `https://heatkings.sneakereco.com`, `https://heatkings.com` | Yes |
| `admin` | `https://admin.heatkings.com` | Yes |
| `unknown` | Anything else | No |

**Domain structure reference** — all possible origin variants across environments:

| URL | What it is |
|---|---|
| `https://sneakereco.com` | Platform marketing / account request page |
| `https://dashboard.sneakereco.com` | Platform admin dashboard |
| `https://api.sneakereco.com` | API — not a browser origin, never appears as `Origin` header |
| `https://heatkings.sneakereco.com` | Tenant storefront **and** admin login (`/admin/login` path) — `heatkings` is an example tenant slug |
| `https://heatkings.com` | Same tenant on a custom domain (storefront) |
| `https://admin.heatkings.com` | Same tenant's admin interface on a custom domain |

The `admin` origin group only applies to custom domains (`admin.heatkings.com`). There is no nested `admin.{slug}.sneakereco.com` subdomain — the admin login for a SneakerEco-hosted tenant is served at `heatkings.sneakereco.com/admin/login`, which falls under the `tenant` origin group.

Classification is DB-backed (queries `tenant_domain_config`) with a 5-minute Valkey cache to avoid a DB hit on every preflight. The `baseDomain` is derived from `PLATFORM_URL` at startup, so dev (`.sneakereco.test`) and prod (`.sneakereco.com`) work without separate configuration.

Any tenant added to `tenant_domain_config` is automatically allowed. No manual CORS allowlist maintenance required.

---

## 11. MFA Policy Enforcement

### Platform Admin — MFA Required (pool-level)

Platform admins **must** have MFA. This is enforced at the Cognito pool level — `MfaConfiguration: 'REQUIRED'` on the platform pool. A platform admin account that hasn't completed TOTP setup cannot sign in at all; Cognito returns an `MFA_SETUP` challenge on first login and the sign-in flow will not complete until TOTP is registered and verified.

### Tenant Pool — MFA Optional (pool-level), Required for Admins (application-level)

The per-tenant Cognito pool has `MfaConfiguration: 'OPTIONAL'`. This is intentional and distinct from the platform pool:

- **Customers** can use the platform without MFA. They may optionally enable it via the MFA lifecycle endpoints after signing in.
- **Tenant admins** are required to set up TOTP. This is enforced by our application code, not by Cognito's pool-level setting. During onboarding completion, the tenant admin is signed in and immediately presented with the TOTP QR setup flow before they can access the dashboard. The `secretCode` is returned from `POST /v1/onboarding/complete`.

If the tenant pool's `MfaConfiguration` were set to `'REQUIRED'`, customers would also be forced through TOTP — which is not the intended UX. The split — pool-level Required for platform, application-level Required for tenant admins — is what allows customers and admins to coexist in the same pool with different MFA expectations.

**Summary:**

| User type | MFA | Enforcement mechanism |
|---|---|---|
| Platform admin | Required | Cognito pool (`MfaConfiguration: 'REQUIRED'`) |
| Tenant admin | Required | Application code (onboarding flow forces TOTP setup) |
| Customer | Optional | User-controlled via `/auth/mfa/*` endpoints |

---

## 12. Platform Admin Login at Tenant Dashboards

A platform admin can authenticate at any tenant's admin login page (`heatkings.sneakereco.com/admin/login` or `admin.heatkings.com/login` on a custom domain) using their platform credentials. This supports impersonation and operational access without needing separate tenant admin credentials.

**How it works:**

1. Tenant admin login page sends `POST /v1/auth/sign-in` with `clientType: 'admin'` and `X-Tenant-ID`
2. `AuthService.signIn()` resolves the tenant admin Cognito pool and attempts authentication
3. The platform admin's credentials are not in the tenant pool → Cognito returns `NotAuthorizedException`
4. `AuthService` catches this and falls back to the platform Cognito pool (no pool arg → `platformAdminClientId`)
5. Authentication succeeds against the platform pool
6. The result is tagged with `usePlatformPool: true`
7. MFA challenge / setup is routed to `/v1/platform/auth/mfa/*` (not `/v1/auth/mfa/*`)
8. The session and tokens issued are platform pool tokens
9. The platform cookie (`/v1/platform/auth` path) is set

**Important:** The resulting JWT has `isSuperAdmin: true` from the platform pool. Any tenant-scoped resource endpoints the platform admin hits will need to handle `tenantId: undefined` from the JWT and instead read tenant context from a URL param or header. This is managed per-endpoint as needed.

> The fallback to the platform pool only fires when the tenant pool rejects the credentials with `NotAuthorizedException`. A missing tenant configuration (`NotFoundException`) propagates as-is so misconfiguration is surfaced correctly, not silently rerouted.

---

## 13. Flow Isolation Guarantees

The following properties prevent cross-contamination between user types:

### Pool Isolation
- Platform admins: platform Cognito pool (manually provisioned, single shared pool)
- Tenant admins + customers: per-tenant Cognito pool (one per tenant, never shared between tenants)
- A token from one tenant's pool cannot authenticate against another tenant's pool — the `iss` URL encodes the pool ID

### Client ID Isolation
- Within a shared tenant pool, admin and customer use different app clients
- `RespondToAuthChallenge` must use the same client that initiated `InitiateAuth` — mismatching clients causes Cognito to reject the session (prevents a customer from completing an admin sign-in challenge)
- The `clientType` field is required for MFA challenge responses to ensure the correct client is used

### Cookie Path Isolation
- Platform: `/v1/platform/auth` — never sent to `/v1/auth` endpoints
- Tenant/Customer: `/v1/auth` — never sent to `/v1/platform/auth` endpoints

### JWT Validation
- Every token is verified against its issuing pool's JWKS endpoint
- Unknown pool IDs are rejected at `resolveSigningKey` — a tenant cannot forge a token from an unregistered pool
- `client_id` claim is validated against known clients for the pool — a customer cannot use an admin client's token on admin-only routes if those routes check the role

### DB-Level Role Separation
- `tenant_members.role` is either `'admin'` or `'customer'`
- Role checks use the `role` field from the resolved `AuthenticatedUser`, not from any client-supplied value
- The `PlatformAdminGuard` additionally checks `isSuperAdmin === true` on protected platform routes

---

## 14. Environment Variables

Auth-relevant env vars. Full list in `apps/api/.env.example`.

| Variable | Purpose |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key — authenticates the API server to AWS so it can call Cognito APIs (create pools, initiate auth, etc.) |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key — paired with `AWS_ACCESS_KEY_ID` |
| `AWS_REGION` | AWS region for Cognito and other services |
| `PLATFORM_COGNITO_POOL_ID` | Platform admin Cognito pool ID |
| `PLATFORM_COGNITO_ADMIN_CLIENT_ID` | Platform admin app client ID |
| `PLATFORM_URL` | Canonical platform URL — used to derive `baseDomain` for CORS and invite link generation (e.g. `https://dashboard.sneakereco.test`) |
| `COOKIE_DOMAIN` | Domain attribute for refresh cookies (e.g. `.sneakereco.test`) — enables cross-subdomain cookie sharing within the same top-level domain |
| `USE_HTTPS` | When `true`, sets `Secure` flag on cookies (local dev with Caddy + mkcert) |
| `VALKEY_URL` | Valkey (Redis) URL for CORS origin cache |
