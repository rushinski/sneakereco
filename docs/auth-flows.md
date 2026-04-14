# SneakerEco — Auth Flows & Cognito Configuration

Three completely separate user types exist. Each has its own Cognito pool (or client), login origin, cookie path, and identity resolution strategy. They share one JWT strategy on the API that branches based on the token issuer.

---

## 1. Platform Admin (Jacob)

**Who:** The SneakerEco operator. One person. Manages onboarding approvals.

**Login URL:** `https://dashboard.sneakereco.test` (dev) / `https://dashboard.sneakereco.com` (prod)

**Frontend app:** `apps/platform`

### Cognito Pool
| Setting | Value |
|---|---|
| Creation | **Manual** — created once in the AWS console, never touched by code |
| Pool ID | Set via `PLATFORM_COGNITO_POOL_ID` env var |
| App client | **Manual** — created once in the AWS console |
| App client type | Public (no secret) |
| Client ID | Set via `PLATFORM_COGNITO_ADMIN_CLIENT_ID` env var |
| Auth flows | `USER_PASSWORD_AUTH`, `REFRESH_TOKEN_AUTH` |
| MFA | TOTP optional on the pool |
| Access token TTL | 60 minutes |
| Refresh token TTL | 24 hours |

### Sign-in Flow
```
POST /v1/platform/auth/sign-in
  → TenantsService.signInAdmin()
  → CognitoService.signIn()  [no pool arg — uses platformAdminClientId]
  → Cognito platform pool
  ← { accessToken, idToken, expiresIn }  (refresh stored in httpOnly cookie)
```

Cookie path: `/v1/platform/auth` — browser only sends it back to the platform refresh endpoint.

### Token Refresh
```
POST /v1/platform/auth/refresh  (CSRF-protected)
  → reads __sneakereco_refresh cookie
  → CognitoService.refreshTokens()  [no pool arg — uses platformAdminClientId]
  ← { accessToken, idToken, expiresIn }
```

### JWT Validation (every authenticated request)
`JwtStrategy` checks `payload.iss === platformIssuer`.  
If matched → `isSuperAdmin: true`, `role: 'admin'`. **No DB lookup.** Identity is implicit from the issuer URL alone.

---

## 2. Tenant Admin (store owner, e.g. HeatKings)

**Who:** The business owner who submitted an onboarding request and was approved by Jacob. Sets up their store, manages inventory and orders.

**Login URL:** `https://admin.{slug}.sneakereco.com` (tenant's own admin subdomain within `apps/web`)

**Frontend app:** `apps/web` (admin section at `/admin`)

### Cognito Pool
| Setting | Value |
|---|---|
| Creation | **Programmatic** — `CognitoService.createTenantPool()` called at approval time |
| Pool ID | Stored in `tenant_cognito_config.user_pool_id` |
| App client | **Programmatic** — `admin` client created alongside the pool |
| App client type | Public (no secret) |
| Auth flows | `USER_PASSWORD_AUTH`, `REFRESH_TOKEN_AUTH` |
| MFA | TOTP `OPTIONAL` on the pool (set via `SetUserPoolMfaConfig` after creation) |
| Access token TTL | 60 minutes |
| Refresh token TTL | **1 day** |

### When the Pool is Created
Jacob clicks "Approve" on the dashboard → `OnboardingService.approveRequest()`:
1. Resolves a unique subdomain slug
2. `CognitoService.createTenantPool()` — creates pool + admin client + customer client
3. Inserts pool config into `tenant_cognito_config`
4. Sends invite email to the business owner

### Onboarding Completion (first-time setup)
Business owner clicks invite link → `POST /v1/onboarding/complete`:
1. `CognitoService.createAdminUser()` — creates the user in the tenant pool
2. Creates `users` + `tenant_members` (role: `admin`, isOwner: true) rows in DB
3. Signs them in immediately and returns a `secretCode` for TOTP setup
4. Redirects to `https://{adminDomain}/admin` to scan the QR code

### Sign-in Flow (subsequent logins)
```
POST /v1/auth/sign-in  (x-tenant-id header required, clientType: "admin")
  → AuthService.signIn()
  → resolves tenant pool from tenant_cognito_config by tenantId
  → CognitoService.signIn()  [admin client]
  ← mfa_required { session }  (MFA is expected for admins)

POST /v1/auth/mfa/challenge  (x-tenant-id header, clientType: "admin")
  → CognitoService.respondToMfaChallenge()
  ← { accessToken, idToken, expiresIn }  (refresh stored in httpOnly cookie)
```

Cookie path: `/v1/auth` — shared with the customer cookie name but a different max-age.

### JWT Validation
`JwtStrategy` sees `payload.iss` matching a tenant pool URL (not the platform issuer).  
Looks up `tenant_members` joined with `users` by `cognitoSub`. Result cached for 60 minutes (matches access token TTL) to avoid a DB hit on every request.  
Returns `{ tenantId, role: 'admin', memberId, isSuperAdmin: false }`.

---

## 3. Customer (shopper)

**Who:** End shoppers who register accounts on a tenant's storefront.

**Login URL:** `https://{slug}.sneakereco.com` (tenant storefront within `apps/web`)

**Frontend app:** `apps/web` (storefront section)

### Cognito Pool
Same pool as the tenant admin — but uses the **customer** app client (created alongside the admin client during pool creation).

| Setting | Value |
|---|---|
| Creation | **Programmatic** — created as part of `createTenantPool()` |
| App client | `customer` client |
| App client type | Public (no secret) |
| Auth flows | `USER_PASSWORD_AUTH`, `REFRESH_TOKEN_AUTH` |
| MFA | TOTP optional (user-controlled via `/auth/mfa/*` endpoints) |
| Access token TTL | 60 minutes |
| Refresh token TTL | **30 days** |

### Registration Flow
```
POST /v1/auth/signup  (x-tenant-id required)
  → Cognito creates UNCONFIRMED user, sends 6-digit code to email

POST /v1/auth/confirm  (x-tenant-id required)
  → Cognito confirms the user
  → Creates users row in DB (cognitoSub stored)
```
No `tenant_members` row is created at confirmation. That row is created by the application layer when the customer completes their profile or places their first order (future flow).

### Sign-in Flow
```
POST /v1/auth/sign-in  (x-tenant-id required, clientType omitted or "customer")
  → AuthService.signIn()
  → resolves tenant pool from tenant_cognito_config by tenantId
  → CognitoService.signIn()  [customer client]
  ← { accessToken, idToken, expiresIn }  (refresh stored in httpOnly cookie)
```

Cookie path: `/v1/auth`. Max-age 30 days (vs 1 day for admin).

### JWT Validation
Same tenant pool issuer path as admin. `JwtStrategy` joins `users` → `tenant_members`.  
Returns `{ tenantId, role: 'customer', memberId, isSuperAdmin: false }`.

---

## How the API Tells Them Apart

All three share one `JwtStrategy`. The branching logic:

```
JWT arrives → decode iss (issuer URL)
│
├── iss === platform pool URL
│     → isSuperAdmin: true, role: 'admin'
│     → no DB lookup
│
└── iss === any tenant pool URL
      → look up tenant_cognito_config by poolId (validates the pool is known)
      → look up tenant_members by cognitoSub (determines tenantId + role)
      → role is 'admin' or 'customer' depending on the tenant_members row
```

The `tenant_cognito_config.user_pool_id` is the authoritative list of known tenant pools. Any JWT from an unknown pool is rejected.

---

## Pool Creation Checklist (createTenantPool)

Called once per tenant at approval time. Steps in order:

1. `CreateUserPoolCommand` — creates pool with email sign-in alias, email-only account recovery, TOTP MFA config deferred to step 2
2. `SetUserPoolMfaConfigCommand` — enables TOTP only (`SoftwareTokenMfaConfiguration: { Enabled: true }`), `MfaConfiguration: 'OPTIONAL'`
3. `AddCustomAttributesCommand` — adds `custom:tenant_id`, `custom:role`, `custom:member_id` schema attributes (legacy; no longer written by any Lambda but retained for schema compatibility)
4. `CreateUserPoolClientCommand` — creates `customer` client (30-day refresh)
5. `CreateUserPoolClientCommand` — creates `admin` client (1-day refresh)

Returns `{ userPoolId, userPoolArn, customerClientId, adminClientId, region }`.

---

## Isolation Summary

| | Platform Admin | Tenant Admin | Customer |
|---|---|---|---|
| Cognito pool | Platform (manual) | Per-tenant (programmatic) | Same as tenant admin |
| App client | Platform admin client | Tenant admin client | Tenant customer client |
| Refresh TTL | 24 hours | 1 day | 30 days |
| Cookie path | `/v1/platform/auth` | `/v1/auth` | `/v1/auth` |
| MFA | TOTP (pool-level optional) | TOTP required at onboarding | TOTP optional |
| Identity via | JWT issuer alone | DB lookup (tenant_members) | DB lookup (tenant_members) |
| `isSuperAdmin` | true | false | false |
| `x-tenant-id` header | Not used | Required | Required |
