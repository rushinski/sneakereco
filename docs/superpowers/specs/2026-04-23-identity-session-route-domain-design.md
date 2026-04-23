# Identity, Session, and Route/Domain Contract Design

## Summary

This spec defines the canonical identity, session, and route/domain contract for SneakerEco's multi-tenant platform. It covers host resolution, route structure, Cognito topology, cookie/session behavior, and auth-policy enforcement for three surfaces:

- `platform-admin`
- `store-admin`
- `customer`

The design keeps a single API and a single tenant-facing Next.js app, but adds a host-bound session layer in the API so the contract is enforceable even when Cognito remains the identity provider.

## Goals

- Standardize canonical auth routes and host behavior across platform, store admin, and customer surfaces.
- Make session scope exact-host and exact-surface.
- Preserve Cognito as the identity provider while moving app-session enforcement into the API.
- Standardize the shared admin-pool model and the per-tenant customer-pool model.
- Define revocation behavior for current-session logout and all-session revocation.
- Make auth and route/domain behavior deterministic enough to implement and test without ambiguity.

## Non-Goals

- Tenant onboarding and approval workflow beyond the identity/session pieces it depends on.
- Admin dashboard UI design.
- Customer auth page component design.
- Observability design.
- Full infrastructure rollout for all environments beyond the Cognito and route/domain requirements in this slice.

## Recommended Architecture

SneakerEco will keep a single central API and will keep Cognito as the source of identity. The API will become the source of truth for app-session binding, cookie selection, canonical host enforcement, and revocation checks.

This avoids introducing multiple APIs or host-specific auth backends while still satisfying the required exact-host session contract.

## Terminology

- `platform-admin`: a SneakerEco operator account that can access the platform dashboard and any store admin surface.
- `store-admin`: a tenant-scoped admin account that can access only its own store admin surface.
- `customer`: an end-user account belonging to a single tenant storefront.
- `surface`: the app audience for the current request. Valid values are `platform-admin`, `store-admin`, `customer`, and `unknown`.
- `managed fallback host`: the SneakerEco-managed hostname used before a tenant's custom domain is active.
- `canonical host`: the single host that should actively serve a given surface once domain configuration is complete.

## Canonical Host And Route Contract

### Platform site and platform admin

- `sneakereco.com` is the public platform site only.
- `sneakereco.com` is used for marketing and the tenant application flow.
- `dashboard.sneakereco.com` is the canonical platform-admin host.
- Platform-admin auth routes live under `/auth/*`.
- The canonical platform-admin login route is `dashboard.sneakereco.com/auth/login`.

### Customer surface

- Customer storefront traffic lives on either:
  - the managed fallback public host `<tenant>.sneakereco.com`, or
  - the tenant's canonical custom public host such as `heatkings.com`
- Customer auth routes always live under `/auth/*` on the public host.
- Canonical customer routes include:
  - `/auth/login`
  - `/auth/register`
  - `/auth/confirm-email`
  - `/auth/forgot-password`
  - `/auth/reset-password`
  - `/auth/otp/request`
  - `/auth/otp/verify`

### Store admin surface

- On the managed fallback host, the store admin surface lives under the tenant public host with an admin path prefix.
- The canonical managed fallback store-admin login route is `<tenant>.sneakereco.com/admin/auth/login`.
- On a tenant custom domain, the store admin surface uses a dedicated admin host.
- The canonical custom-domain store-admin login route is `admin.<tenant-domain>/auth/login`.
- On managed fallback hosts, the store admin app namespace is `/admin/*`.
- On dedicated admin hosts, the store admin app namespace is `/`.

### Canonical host enforcement

- Once a tenant's custom public and custom admin domains are active, the managed fallback hosts stop acting as parallel live surfaces.
- Managed fallback customer routes redirect to the canonical custom public host.
- Managed fallback store-admin routes redirect to the canonical custom admin host.
- Redirects must preserve intent and normalize paths. Example:
  - `<tenant>.sneakereco.com/admin/auth/login` redirects to `admin.<tenant-domain>/auth/login`

## Identity Topology

### Admin identity model

- All admin accounts share one Cognito user pool.
- That pool contains two app clients:
  - `platform-admin`
  - `store-admin`
- The shared admin user pool and both admin app clients are managed by Terraform.
- Terraform outputs become the canonical source for infrastructure values consumed by the application environment.
- Manual AWS CLI or click-ops changes are not part of the desired steady state.

### Customer identity model

- Each tenant has its own customer user pool and customer app client.
- Tenant customer pools and customer app clients are created programmatically with the AWS SDK during tenant lifecycle provisioning.
- The programmatic customer-pool model remains part of tenant lifecycle design and is not migrated to Terraform in this slice.

## Account Rules

### Platform admins

- Cannot sign up.
- Cannot use OTP email-code login.
- Cannot use self-service password reset.
- Must use software TOTP MFA.
- May authenticate on `dashboard.sneakereco.com/auth/login`.
- May also authenticate on any store-admin login surface.

### Store admins

- Cannot sign up.
- Cannot use OTP email-code login.
- Can use self-service password reset.
- Must use software TOTP MFA.
- Can authenticate only on their own store-admin surface.
- If a store admin attempts to authenticate on another tenant's store-admin surface, the system must behave as though the account does not exist there.

### Customers

- Can sign up.
- Must confirm email after signup.
- Can use OTP email-code login.
- MFA is optional.

### Shared challenge window

- The Cognito challenge/setup session window remains 10 minutes.

### Token lifetimes

- `platform-admin`
  - access token: 30 minutes
  - refresh token: 1 day
  - refresh cookie: 1 day
- `store-admin`
  - access token: 30 minutes
  - refresh token: 1 day
  - refresh cookie: 1 day
- `customer`
  - access token: 60 minutes
  - refresh token: 30 days
  - refresh cookie: 30 days

## Admin Account Classification

- Admin account type must be enforced explicitly.
- The design must not rely on "try one admin client, then fall back to the other."
- Store admins may authenticate only through the `store-admin` app client.
- Platform admins may authenticate through:
  - the `platform-admin` app client on the platform-admin surface
  - the `platform-admin` app client on any store-admin surface
- Store admins must not be able to authenticate through the `platform-admin` app client.
- A store-admin surface login attempt for a store admin with no membership in that tenant must fail as if the account is unavailable on that surface.

The implementation should use an explicit admin classification control in Cognito, such as groups or a custom attribute, combined with API-side membership checks. The key requirement is deterministic enforcement, not the specific Cognito primitive.

## Cross-Surface Access Rules

- Platform admins are the only accounts allowed to authenticate on every store-admin surface.
- After successful authentication on a store-admin surface, a platform admin lands directly in that tenant's admin area with platform-level privileges.
- Store-admin accounts are tenant-scoped.
- A store-admin account authenticated for one tenant does not gain access to any other tenant's store-admin surface.

## Session Contract

### Surface binding

- App sessions are bound to an exact surface key, not only to a user.
- The surface key is derived from:
  - canonical host
  - surface

Examples:

- `dashboard.sneakereco.com` + `platform-admin`
- `heatkings.com` + `customer`
- `heatkings.sneakereco.com` + `customer`
- `heatkings.sneakereco.com` + `store-admin`
- `admin.heatkings.com` + `store-admin`

This distinction is required because the managed fallback public host can serve both customer and store-admin surfaces.

### Frontend token handling

- Access tokens remain memory-only in the frontend.
- Access tokens are never persisted to `localStorage` or `sessionStorage`.
- Frontends refresh through the API when the in-memory access token expires or when the app reloads.

### Cookie rules

- Refresh state remains cookie-based at the API domain.
- Refresh cookies must be surface-specific and host-specific.
- Cookie names must use the `__Secure-` prefix and be derived from the current surface key.
- Refresh cookies must be:
  - `Secure`
  - `HttpOnly`
  - `SameSite=None`
  - `Partitioned`
- The refresh endpoint reads only the refresh cookie associated with the currently resolved surface key.
- The CSRF cookie follows the same surface-specific naming rule so customer and store-admin flows on the same managed fallback host do not collide.
- Parent-domain cookie behavior that creates cross-host session sharing is not allowed.

### Exact-host scope

- Sessions are exact-host scoped.
- A login on `heatkings.com` is not a login on `heatkings.sneakereco.com`.
- A login on `dashboard.sneakereco.com` is not a login on `admin.heatkings.com`.
- A platform-admin login on one store-admin host does not create a valid session on another store-admin host.

## Revocation Contract

### Required actions

- `Logout current session` revokes only the refresh token and access lineage for the current surface session.
- `Revoke all my sessions` revokes every active session for the current account.
- Platform admins can revoke all sessions for any store-admin or customer account.

### Cognito responsibilities

- Use `RevokeToken` for current-session refresh token revocation.
- Use `GlobalSignOut` for "revoke all my sessions."
- Use `AdminUserGlobalSignOut` for platform-admin-triggered all-session revocation of another user.

### API responsibilities

- Cognito revocation by itself is not sufficient because locally validated JWTs can still look structurally valid until expiry.
- The API must enforce revocation during JWT authorization.
- The API must track revoked current-session lineage using token lineage identifiers such as `origin_jti`.
- The API must also track a user-wide `revoke_before` cutoff timestamp for all-session revocation.
- JWT authorization must reject a token when:
  - the token lineage has been revoked, or
  - the token was issued before the user's `revoke_before` cutoff

### Deliberate v1 limit

- This slice does not require a persistent end-user-visible "session inventory" or "device management" feature.
- The first version only needs:
  - current-session logout
  - all-session revocation
  - platform-admin all-session revocation of target users

## Request Resolution Contract

- Request classification must be based on the effective app host and surface path rules, not on user-supplied tenant hints.
- Origin classification by itself is not sufficient because managed fallback store-admin uses a path prefix while custom-domain store-admin uses a dedicated host.

### Required request-context shape

- `hostType`: `platform | store-public | store-admin-host | unknown`
- `tenantId`
- `tenantSlug`
- `surface`: `platform-admin | store-admin | customer | unknown`
- `canonicalHost`
- `isCanonicalHost`
- `authPool`

### Resolution rules

- `dashboard.sneakereco.com` resolves to:
  - `hostType=platform`
  - `surface=platform-admin`
- `<tenant>.sneakereco.com` resolves to:
  - `hostType=store-public`
  - `surface=customer` for public and customer-auth routes
  - `surface=store-admin` for `/admin/*`
- `<tenant custom public domain>` resolves to:
  - `hostType=store-public`
  - `surface=customer`
- `admin.<tenant custom domain>` resolves to:
  - `hostType=store-admin-host`
  - `surface=store-admin`

### Pool resolution rules

- Customer requests resolve only to the tenant customer pool/client.
- Platform-admin requests resolve only to the shared admin pool with the `platform-admin` client.
- Store-admin requests resolve only to the shared admin pool.
- Within the store-admin surface:
  - store-admin accounts use the `store-admin` client
  - platform-admin accounts use the `platform-admin` client
- The system must not rely on an email-first fallback strategy to guess which admin client to use.
- Admin client choice must be deterministic and must reject invalid account/surface combinations cleanly.

## API Boundary Rules

- `/auth/register`, `/auth/confirm`, `/auth/confirm/resend`, and `/auth/otp/*` are customer-only.
- `/auth/forgot-password` and `/auth/reset-password` are allowed on:
  - customer surfaces
  - store-admin surfaces
- `/auth/forgot-password` and `/auth/reset-password` are forbidden on the platform-admin surface.
- `/auth/login`, `/auth/refresh`, `/auth/logout`, MFA challenge/setup endpoints, and session-revocation endpoints are surface-aware.
- Any tenant-scoped admin endpoint must require:
  - an authenticated admin identity
  - tenant context resolved from the current surface
- Tenant context must not be sourced from a user-supplied tenant header for ordinary admin requests.

## Security And Error Handling

- Unknown or disallowed hosts return a generic auth-context failure and must not leak tenant existence.
- Non-canonical managed hosts redirect when a canonical custom host exists instead of serving parallel auth pages.
- Wrong-surface attempts fail closed.

Examples:

- customer-only endpoint on a store-admin or platform-admin surface: forbidden
- admin-only endpoint on a customer surface: forbidden
- platform-admin password reset attempt: forbidden
- store-admin attempting platform-admin authentication: unauthorized
- store-admin authenticating on the wrong tenant surface: generic unavailable/unauthorized result equivalent to account absence on that surface
- customer auth when tenant customer pool is missing: configuration error, not silent fallback

- Login, forgot-password, reset-password, and OTP flows must avoid disclosing whether an email exists when Cognito or app policy supports that behavior.
- Revoked-session failures must produce a stable auth failure that the frontend can handle by:
  - clearing in-memory access state
  - returning the user to the current surface's login route

## Testing Requirements

Implementation of this spec must include contract-level tests for:

- request-context classification for all supported host and path combinations
- canonical redirect behavior after custom domains become active
- pool and client resolution for customer, store-admin, and platform-admin flows
- exact-surface refresh isolation
- current-session logout revoking only the current surface session lineage
- all-session revocation invalidating future API usage of previously issued access tokens through API-side revocation checks
- store-admin password reset allowed
- platform-admin password reset forbidden
- customer signup and OTP allowed only on customer surfaces
- admin MFA enforced
- customer MFA optional
- platform-admin authentication on a store-admin surface landing with platform privileges in the current tenant context
- store-admin authentication succeeding only for the tenant in which the account has membership
- wrong-tenant store-admin authentication behaving as though the account is unavailable on that surface

## Implementation Notes For Later Planning

- The current request-classification model should evolve from coarse origin categories to explicit surface-aware request context.
- The current session/cookie model should be replaced with surface-keyed refresh and CSRF cookie names.
- The current implicit admin-client fallback behavior should be removed.
- Browser-level verification is required for `SameSite=None` plus `Partitioned` cookies in both local HTTPS and production domain topologies.

## Decision Summary

- The canonical terms are `platform-admin`, `store-admin`, and `customer`.
- The recommended architecture is a single API plus API-owned host-bound session enforcement on top of Cognito.
- The shared admin pool and its two admin clients are Terraform-managed.
- Tenant customer pools remain AWS SDK provisioned.
- Platform-admin accounts may authenticate on any store-admin surface.
- Store-admin accounts may authenticate only on their own store-admin surface.
- Customer and admin auth routes are standardized under `/auth/*`.
- Managed fallback hosts redirect once canonical custom domains are active.
- Sessions are exact-host and exact-surface scoped.
- Revocation requires both Cognito actions and API-side revocation enforcement.

## Source Notes

AWS Cognito revocation behavior referenced while drafting this spec:

- `https://docs.aws.amazon.com/cognito/latest/developerguide/token-revocation.html`
- `https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-refresh-token.html`
