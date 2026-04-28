# SneakerEco Auth And Platform Architecture Design

## Purpose

This document locks the architecture for SneakerEco's authentication, tenant onboarding, tenant identity provisioning, browser session handling, tenant-facing auth customization, auth email rendering, and the foundational NestJS platform runtime needed to support those capabilities.

It is intentionally a replacement for prior outdated planning documents. Where old repo documents conflict with this spec, this spec wins for the auth/platform rebuild.

## Architectural Direction

SneakerEco will use a platform-orchestrated authentication model with AWS Cognito as the identity engine.

Cognito remains responsible for credential verification, MFA mechanics, verification-session timing, and token issuance. SneakerEco remains responsible for platform workflow, tenant lifecycle, invitation/setup orchestration, branded auth UX, session records, revocation, auditing, provisioning, and email delivery orchestration.

The browser session edge will be owned by the relevant Next.js app through a backend-for-frontend pattern rather than by cross-site cookies from `api.sneakereco.com`.

## Locked Decisions

### Identity boundaries

- A single shared Cognito user pool is used for all admins.
- Admin classification is based on Cognito groups and claims, not on app client identity.
- Admin roles are:
  - `platform_admin`
  - `tenant_admin`
- A `tenant_admin` belongs to exactly one tenant in v1.
- Each tenant receives its own customer Cognito user pool and customer app client.
- Customer identities are tenant-local by design, so the same email may exist across multiple tenant stores.

### Admin policy

- Platform admins cannot self-register.
- Tenant admins cannot self-register.
- Platform admins are manually created.
- Tenant admins are created only after a successful onboarding approval flow.
- All admins must use TOTP MFA.
- Admins cannot use email-code OTP login.
- Admin access tokens last 30 minutes.
- Admin refresh tokens and refresh-cookie-backed sessions last 1 day.

### Customer policy

- Customers can self-register.
- Customers must confirm email after signup.
- Customer MFA is optional and TOTP-only.
- Customer OTP login is email-code-only.
- Customer access tokens last 1 hour.
- Customer refresh tokens and refresh-cookie-backed sessions last 30 days.

### Verification-session policy

- Both admin and customer Cognito verification/challenge sessions use a 10-minute session window.
- This includes MFA challenge continuation after password entry.

### Browser auth boundary

- The browser does not depend on third-party cookies issued by `api.sneakereco.com`.
- Each active frontend origin acts as a BFF:
  - `dashboard.sneakereco.com`
  - `{tenant}.sneakereco.com`
  - `{tenant}.sneakereco.com/admin`
  - `{tenant-custom-domain}`
  - `admin.{tenant-custom-domain}`
- Browser-facing login, refresh, logout, and similar session endpoints terminate at the current frontend origin first.
- The frontend BFF communicates with the NestJS API server-to-server.

### Session control

- Session control is database-backed, not Cognito-only.
- Cache is used for hot revocation/session lookups.
- The architecture must support:
  - current-session logout
  - logout all sessions for a user
  - admin-forced session revocation for a user
  - tenant-wide emergency revocation

### Eventing

- Cross-boundary side effects use a durable outbox pattern.
- Services do not directly depend on queue publication for correctness.
- Background processing runs in a separate worker entrypoint from the HTTP API process.

### Backend structure

- NestJS uses Fastify, not Express.
- `core` contains infrastructure and cross-cutting platform capabilities.
- `modules/auth`, `modules/tenants`, and `modules/platform-onboarding` are separate top-level modules.
- Shared Cognito integration lives under `core/cognito`.
- Cache and queue are separate runtime capabilities, even if they share Valkey infrastructure.

### Tenant-owned data isolation

- Tenant-owned application data uses PostgreSQL row-level security.
- Platform/system/auth tables may live outside tenant RLS where that is the correct boundary.
- The design should distinguish platform-global tables from tenant-scoped tables explicitly.

### Tenant web-builder/auth customization

- Customer auth pages use a component-composition renderer driven by structured tenant configuration.
- Auth page configuration must be validated against capability contracts so required auth flows cannot be removed accidentally.
- Admin dashboards inherit brand/theme tokens, but are not freeform page-builder surfaces.

### Auth email architecture

- Auth emails use a structured section-based templating system.
- Email templates are parallel to, but narrower than, the customer-facing page component system.
- Sender identity resolution supports staged evolution:
  - centralized SneakerEco-managed branded sender identities first
  - tenant-owned sender identities later

## System Boundaries

### Cognito owns

- Password verification
- Token issuance
- Refresh token validity windows
- MFA challenge/session mechanics
- TOTP association and verification mechanics
- Email-confirmed/unconfirmed identity state

### SneakerEco owns

- Platform onboarding workflow
- Tenant approval and denial workflow
- Tenant provisioning orchestration
- Tenant-admin invitation and setup-session state
- Session records and revocation policy
- Audit logging
- Route-level security policy
- Tenant-branded auth page composition
- Tenant-branded auth email selection and delivery orchestration
- Cross-system eventing and retry behavior

## High-Level Flow Design

### Customer auth flow family

Supported customer flows:

- Login
- Logout
- Register
- Confirm email
- Forgot password
- Reset password
- Optional MFA challenge
- MFA setup/disable/enable
- Email-code OTP login
- Refresh session

Customer registration remains tenant-local because each tenant owns its own Cognito customer pool and app client.

### Admin auth flow family

Supported admin flows:

- Platform admin login
- Tenant admin login
- Logout
- Refresh session
- Required MFA challenge
- Required MFA setup during account setup or enablement lifecycle
- MFA disable only through authorized lifecycle flow if allowed by policy

Unsupported admin flows:

- Self-signup
- OTP login

### Tenant onboarding flow

1. Prospect submits a tenant-admin application on `sneakereco.com`.
2. The platform stores an application record.
3. The applicant receives a submission-confirmation email.
4. Platform staff receive an application notification email.
5. A platform admin reviews the application in `dashboard.sneakereco.com`.
6. The platform admin approves or denies the application.
7. On denial:
   - application state becomes `denied`
   - a denial email is sent
8. On approval:
   - application state becomes `approved`
   - tenant record is created
   - tenant slug/subdomain reservation is created
   - tenant customer pool and app client are provisioned
   - tenant-admin user is created immediately in the shared admin pool
   - tenant-admin role/group metadata is assigned
   - setup invitation is issued
   - approval/setup email is sent
9. The tenant admin clicks the setup link.
10. SneakerEco validates the setup invitation and creates a setup session.
11. The tenant admin sets a password and completes TOTP enrollment.
12. The tenant becomes active and the tenant admin lands in the tenant admin dashboard.

### Tenant-admin setup flow

- Setup begins with a SneakerEco-issued invitation/session, not directly with an unmanaged Cognito first-login flow.
- Setup tokens are single-use, expire, are revocable, and are bound to tenant, email, and admin identity.
- The platform records invitation issuance, consumption, expiration, and revocation in its own database.
- After invitation verification, the platform orchestrates password setup and required TOTP enrollment through Cognito-backed steps.

### Platform-admin access model

- Platform admins do not sign directly into tenant-admin dashboards as tenant admins.
- No delegated support-session or impersonation capability is included in v1.
- Platform-admin control remains within the platform dashboard boundary.

## Session Architecture

### Session model

Every authenticated browser session is represented by:

- Cognito-issued tokens
- A SneakerEco session/device record in the database
- A BFF-issued same-site refresh cookie
- A cache-backed revocation/session-status layer

The browser keeps access tokens in memory only. When access expires or the page reloads, the browser uses the same-origin BFF refresh endpoint.

### Session record shape

At minimum, the session model must support fields equivalent to:

- `id`
- `user_id`
- `tenant_id` nullable for platform admins
- `actor_type`
- `device_id`
- `status`
- `refresh_token_fingerprint`
- `issued_at`
- `expires_at`
- `last_seen_at`
- `last_refresh_at`
- `ip_metadata`
- `user_agent`
- `revoked_at`
- `revocation_reason`

Exact schema naming may vary, but the platform must preserve these capabilities.

### Cookie strategy

The important refresh cookie is a first-party cookie issued by the active frontend origin. It is not a dependency on third-party cross-site cookies from the API origin.

Cookie policy for the BFF-managed refresh/session cookie:

- `Secure`
- `HttpOnly`
- `__Secure-` prefix
- `SameSite=Lax` by default, with stricter usage where route behavior allows it

`Partitioned` is not a design dependency. The architecture avoids relying on browser-specific third-party cookie exceptions whenever possible.

### Revocation

Revocation behavior requires all of the following:

- mark session records revoked in the database
- update revocation/session-status cache indexes
- revoke Cognito refresh tokens where appropriate
- reject future refresh attempts based on platform session status
- define behavior for already-issued access tokens until expiration

Because access tokens are short-lived, the primary hard revocation boundary is refresh/session continuity plus local access validation policy.

## Security Controls

### CSRF

Because refresh/logout/session mutation flows use cookies at the BFF boundary, CSRF protections are required.

Minimum model:

- strict origin checking
- explicit allowed-origin/domain validation
- CSRF token strategy for browser-initiated state-changing requests

### CORS

- Browser flows should prefer same-origin BFF routes, reducing CORS pressure.
- Nest API CORS must be explicit and validated, not wildcard-open.
- Tenant custom domains must be resolved through trusted domain configuration, not reflected blindly.

### CSP

- CSP is required on the Next.js applications, not only the API.
- Platform and tenant apps may use different CSP shapes depending on editor preview and asset requirements.
- Policies must account for Tailwind-based styling, approved asset sources, and any email-preview or image-hosting dependencies.

### Rate limiting

Rate limits must be route-specific and identity-aware where applicable.

High-priority protected routes include:

- login
- OTP request
- OTP verify
- forgot password
- password reset
- MFA challenge
- setup invitation consume
- refresh
- tenant application submission
- tenant approval/denial actions

### Additional controls

- hashed invitation/reset/OTP tokens at rest
- request IDs and propagated correlation IDs
- suspicious-auth telemetry hooks
- replay protection for setup and code-consumption flows
- idempotency for approval/provisioning actions
- startup config validation
- Fastify-compatible security hardening middleware
- OpenAPI/Swagger exposure controls by environment

## Backend Runtime Architecture

### Module structure

Recommended API structure:

```text
apps/
  api/
    src/
      main.ts
      worker-main.ts
      app.module.ts

      common/
        constants/
        decorators/
        dto/
        errors/
        filters/
        guards/
        interceptors/
        middleware/
        pipes/
        serializers/
        types/
        utils/

      core/
        config/
        database/
        cache/
        queue/
        cognito/
        email/
        events/
        observability/
        security/

      modules/
        auth/
        users/
        tenants/
        platform-onboarding/
        admin-access/
        web-builder/
        communications/
        audit/

      workers/
        outbox/
        email/
        tenant-provisioning/
```

### Core responsibilities

- `core/config`: validated runtime configuration and environment contracts
- `core/database`: connection management, Drizzle integration, RLS support
- `core/cache`: cache and revocation lookups
- `core/queue`: BullMQ or equivalent queue integration
- `core/cognito`: AWS Cognito integration and provisioning primitives
- `core/email`: transport and email rendering infrastructure
- `core/events`: outbox persistence and dispatch
- `core/observability`: logging, health, metrics, tracing
- `core/security`: CSRF, CORS, CSP, cookies, rate limiting, request ID, related enforcement

### Product module responsibilities

- `modules/auth`: auth use cases and session lifecycle orchestration
- `modules/users`: user records and related repository/service responsibilities
- `modules/tenants`: tenant data, domain handling, tenant identity provisioning coordination
- `modules/platform-onboarding`: prospect application, review, approval/denial, setup invitations
- `modules/admin-access`: platform-admin and tenant-admin authorization behavior
- `modules/web-builder`: tenant page/theme/auth page configuration and preview support
- `modules/communications`: higher-level email/notification orchestration
- `modules/audit`: persisted audit trails and retrieval

### Worker topology

Workers must run as a separate Nest entrypoint from the HTTP API.

Initial workers:

- outbox dispatcher
- email delivery
- tenant provisioning

Additional workers may be added later without changing the architectural boundary.

## Data Ownership And Isolation

### Platform-global data

Platform-global or cross-tenant data includes:

- onboarding applications
- platform admin records
- tenant records
- tenant identity configuration records
- setup invitations
- audit events that are platform-scoped
- outbox events
- sender identity readiness records

### Tenant-scoped data

Tenant-scoped data includes:

- customer-facing page configuration
- theme configuration
- customer user/application records where stored locally
- tenant admin contextual records linked to a tenant
- tenant business settings
- tenant operational domain/email configuration

Tenant-scoped application data uses PostgreSQL RLS as the primary isolation mechanism.

## Tenant Web And Auth Page Architecture

### Route design

Customer routes:

- `/login`
- `/register`
- `/verify-email`
- `/forgot-password`
- `/reset-password`
- `/otp`
- `/mfa`

Tenant admin routes:

- `/admin/login`
- `/admin/setup`
- `/admin/mfa`

Platform admin routes:

- `dashboard.sneakereco.com/login`
- `dashboard.sneakereco.com/mfa`

Customer auth routes remain simple and top-level. Admin flows are separated through the admin path/domain boundary.

### Auth page renderer

Customer auth pages are rendered from structured tenant configuration against a controlled variant registry.

Configurable units may include:

- page shell/layout
- hero/media section
- brand/header block
- form container variant
- supporting content block
- footer/legal block
- alternate action links

Allowed customization includes:

- theme token selection
- bounded per-page overrides
- bounded per-section content overrides where supported
- approved variant selection

Arbitrary markup or code injection is not part of the model.

### Capability contract

Each auth-page configuration must satisfy required capability contracts for enabled auth features. Capabilities include:

- primary sign-in
- navigation to registration
- forgot-password path
- verify-email continuation
- reset-password continuation
- OTP entry
- MFA challenge entry
- status and error presentation

The configuration validator must reject page states that remove required flows for enabled tenant auth features.

## Admin Dashboard UX Boundary

The tenant admin dashboard inherits brand-level presentation:

- logo
- business name
- color theme
- selected typography/token set within controlled limits

The admin dashboard is not a freeform builder surface.

Initial information architecture:

- sidebar with tenant logo/business name
- dashboard entry
- web design entry
- header search bar
- breadcrumb trail
- responsive preview switching in the web-design area

Preview modes:

- desktop default
- tablet
- mobile

Only one preview mode is shown at a time.

### Initial admin dashboard visual direction

The tenant admin dashboard should follow the uploaded dashboard reference at the shell level, not at the analytics-widget level.

The intended direction is:

- dark left sidebar
- lighter main content surface
- tenant logo and business name at the top of the sidebar
- compact initial navigation:
  - `Dashboard`
  - `Web design`
- top header with a search bar instead of the dashboard/settings/users tab treatment from the reference
- breadcrumb or route trail beneath the header
- stable app-shell layout that can host the web-design editor and preview surfaces

The initial dashboard page itself can remain sparse. The point of the reference is the shell structure, sidebar tone, and header/trail relationship.

The tenant admin dashboard inherits tenant branding and theme tokens within controlled limits, but it is not a tenant-composed layout surface.

## Auth Email Architecture

### Template model

Auth emails use a structured section-based template system, parallel to the customer auth page system but intentionally narrower.

Templates support:

- shared layout variants
- theme token application
- controlled content sections
- auth-purpose-specific wording/data injection

### Auth email types

Initial supported email types include:

- signup verification
- login OTP code
- forgot password
- password reset confirmation if enabled
- onboarding application submission confirmation
- onboarding application approved
- onboarding application denied
- tenant-admin setup invitation

### Design family relationship

Auth page variants and auth email variants should share a design-family relationship so a tenant can choose a coherent auth visual family across page and email surfaces.

### Initial auth email family direction

The first auth email families should clearly map back to the first auth page families.

#### Email Family A: Minimal editorial light

This family is the transactional counterpart to the minimal light auth family:

- light background
- narrow centered content column
- restrained typography hierarchy
- subtle separators
- quiet footer
- clean verification-code presentation

It should feel obviously related to the minimal auth page family, not like a generic SaaS transactional email.

#### Email Family B: Bold dark branded

This family follows the uploaded dark verification email reference and should pair with the bold split auth family:

- dark background or dark card treatment
- prominent logo area
- high-contrast heading/body structure
- strong code or action block
- branded accent usage derived from tenant tokens
- structured footer with store/contact identity

It should feel like the email counterpart to the bold split auth page family.

### Sender identity strategy

The email layer must resolve sender identity based on:

- tenant
- email purpose
- domain readiness state
- environment

Rollout model:

1. SneakerEco-managed branded sender identities such as `auth@{tenant}.sneakereco.com`
2. tenant-owned branded sender identities such as `auth@{tenant-domain}`

### Local development

- Local development uses SMTP to Mailpit.
- Production uses SES-backed delivery.
- Business logic should not branch heavily by environment; only transport and sender-identity resolution should vary.

## Infrastructure And Configuration

### Terraform ownership

Manually managed AWS Cognito infrastructure for the shared admin pool/client setup must still be represented in Terraform under `infra/`.

Terraform-managed shared resources include at least:

- shared admin user pool
- required admin app clients
- admin groups
- supporting SES/Cognito integration configuration where appropriate

Programmatic tenant customer pool/client creation remains part of the tenant lifecycle handled by the application.

### Environment configuration

Current environment variables are close to the required set, but the final contract should be normalized around:

- AWS credentials and region
- shared admin Cognito identifiers
- database URLs
- cache/queue URLs
- log level
- mail transport
- platform URLs and sender defaults
- cookie/security secrets
- base domain/domain-routing configuration

The final implementation plan should refine names and add missing domain/session settings as needed.

## Open Questions Removed By This Spec

This spec intentionally resolves the following prior ambiguities:

- admin type is not determined primarily by app client
- custom-domain browser auth should not depend on cross-site cookies from the API
- cache and queue are separate runtime capabilities
- onboarding/provisioning is not nested inside auth as the primary lifecycle owner
- platform admins do not log directly into tenant-admin dashboards
- customer identity remains per-tenant pool by product design

## Planned Implementation Breakdown

Implementation will be split into separate plans after this spec is approved:

1. Identity and Cognito foundation
2. NestJS platform foundation
3. Auth and session control
4. Platform onboarding and tenant provisioning
5. Tenant web-builder and auth page contracts
6. Next.js BFF auth boundary and auth UX
7. Auth email rendering and delivery
8. Hardening, audit, and operational controls

## Acceptance Criteria For This Spec

This design is considered accepted when it provides enough clarity to produce implementation plans without revisiting foundational decisions about:

- shared-admin vs per-tenant-customer identity boundaries
- BFF session architecture
- onboarding/provisioning workflow ownership
- backend module structure
- session revocation model
- tenant auth-page customization safety
- auth email templating model
- Terraform vs programmatic Cognito ownership boundaries

## Appendix A: Web Customization System

This appendix defines the broader customer-facing customization system that auth pages will live inside. The system is intentionally generic from day one even if the first implementation focus is auth.

### Scope

The underlying web customization system must be designed to support all customer-facing page families, including:

- header
- hero
- featured content sections
- footer
- product search bar
- cart
- auth pages
- shopping/storefront page
- product page
- contact page

Auth pages are the first implemented slice, not a special one-off system.

### Boundary between customer surfaces and admin surfaces

Deep customization applies only to customer-facing pages and auth emails.

Tenant admin surfaces inherit selected branding and theme tokens, but are not customizable with the same freeform composition model. The tenant admin dashboard remains a platform-controlled application shell with tenant branding applied to it.

The platform dashboard does not participate in tenant branding customization.

### Design goals

The customization system must satisfy all of the following:

- allow strong brand differentiation across tenants
- keep rendering deterministic and testable
- preserve accessibility and auth-flow completeness
- support live previews
- support draft and published workflows
- support scheduled coordinated releases
- support rollback
- avoid arbitrary code or arbitrary CSS input
- avoid structural combinations that break responsive layout or flow requirements

### Core model

The customization system is composed of six layers:

1. global platform registry
2. global design families
3. tenant theme configurations
4. tenant page configurations
5. tenant release sets
6. preview and validation projections

#### 1. Global platform registry

The platform owns a global catalog of reusable design assets:

- design families
- component families
- component variants
- slot definitions
- page-type definitions
- schema definitions for structured content fields
- validation rules
- preview-state fixtures

All tenants see the same catalog in v1.

#### 2. Global design families

A design family is the highest-level visual grouping. It ties together:

- compatible page shell variants
- compatible auth shell variants
- compatible email layout variants
- compatible token defaults
- compatible button and form styling behavior

A tenant selects a design family as the base visual direction, then may override bounded parts of the system without breaking compatibility.

#### 3. Tenant theme configurations

Each tenant owns theme configurations built on a fixed token model.

Required token groups:

- color tokens
  - `brand`
  - `accent`
  - `surface`
  - `text`
  - `muted`
  - `danger`
- typography tokens
  - font-family pairing
  - type scale selection
- radius tokens
  - control radius scale
  - panel radius scale
- spacing tokens
  - density/spacing scale
- button-style tokens
  - button style family
  - emphasis behavior across primary and secondary actions

Tenants do not provide arbitrary CSS. They select or edit bounded token values exposed by the platform.

#### 4. Tenant page configurations

Each customer-facing page type is configured through structured records referencing:

- page type
- selected design family
- selected shell/layout variant
- selected slot variant assignments
- structured content payloads
- theme override payloads where allowed
- preview-state metadata
- version references to exact platform variants

#### 5. Tenant release sets

Published customer-facing design changes are coordinated through release sets, not piecemeal resource toggles.

A release set may include:

- one theme configuration
- one or more page configurations
- one or more auth page configurations
- one or more auth email configurations

Release sets support:

- draft state
- scheduled publish
- immediate publish
- historical version tracking
- first-class rollback

#### 6. Preview and validation projections

The editor and preview system must render draft resources as if they were live without changing public production state. Validation runs against the draft projection before publish.

### State model

Customization resources must support at least:

- draft
- published
- scheduled
- archived

The system must also maintain historical published versions and rollback targets.

There may be multiple saved variants of the same page/email type, but only one active published variant per applicable route or release target at a time.

### Versioning rules

Published tenant configurations are pinned to explicit platform variant versions.

This means:

- a live tenant page references a specific component/layout variant version
- future platform updates do not silently mutate live tenant output
- tenants may upgrade to newer compatible versions through explicit draft/edit/publish workflows

This prevents the platform registry from behaving like an invisible deployment mechanism against tenant storefronts.

### Release workflow

The release model is intentionally richer than simple save-and-go-live behavior.

#### Drafts

- edits occur against draft resources
- drafts can be previewed live in the editor
- drafts do not affect public storefront or live auth flows

#### Scheduled publish

- releases may be published immediately or at a scheduled time
- scheduled publishes operate on coordinated release sets
- coordinated release sets prevent mixed states such as a new auth page using an old email family or an old theme

#### Rollback

- rollback is a first-class feature
- rollback can restore a prior coordinated release set
- rollback must be auditable
- rollback must be designed to restore the exact pinned variants and theme values that were previously live

### Editing and concurrency model

The system supports multi-admin editing without hard edit locks.

V1 behavior:

- optimistic concurrency with conflict detection
- stale edits are detected at save/publish time
- silent last-write-wins is not acceptable for design resources

### Fixed-slot page model

The page system uses fixed named slots with allowed component families per slot.

This is a deliberate constraint. Pages do not support arbitrary reordering of sections in v1.

Example structural page slots may include:

- `header`
- `hero`
- `featured_primary`
- `featured_secondary`
- `body`
- `footer`

Each slot allows only compatible component families defined by the registry.

This gives the platform:

- deterministic rendering
- validation of required structure
- stronger responsive guarantees
- easier preview tooling
- easier future analytics and testing

### Auth page model

Auth pages use a narrower form of the same system.

They are modeled as:

- a shared auth-shell family
- page-type-specific form/content configurations

Auth page types include:

- login
- register
- verify-email
- forgot-password
- reset-password
- otp
- mfa

Each auth page type shares compatible shell behavior from the selected design family while still exposing its own structured form/content configuration.

### Initial auth-page family direction

The first auth families should not be treated as placeholder skins. They should establish two clearly different visual languages.

#### Auth Family A: Minimal editorial light

This family follows the light centered auth reference:

- bright, open, mostly white or very light neutral canvas
- centered auth experience with large surrounding negative space
- restrained typography-led presentation
- minimal chrome and minimal decorative treatment
- quiet borders and spacing rhythm
- understated helper links such as signup and forgot password

It should feel premium, calm, and minimal.

#### Auth Family B: Bold split dark

This family follows the dark split auth reference:

- dramatic split layout
- strong branded content panel on one side
- dark or near-black visual base
- high-contrast typography
- stronger accent usage
- bolder primary action treatment
- more assertive streetwear/fashion tone

It should feel brand-forward, modern, and energetic without becoming noisy.

### Initial auth shell behavior expectations

Family A behavior:

- centered single-column shell
- compact stacked form area
- optional supporting copy above the form
- minimal affordance area below the form for alternate actions

Family B behavior:

- split shell with branded content panel and dedicated form panel
- larger hero-style messaging on the branded side
- stronger use of logo, accent, and campaign-style copy
- explicit alternate-flow affordances such as OTP and registration on the form side

Both families must support all required auth states from the capability contract and preview-state system.

### Slot and override rules

The system supports global theme plus bounded overrides.

Override precedence:

1. platform default design family tokens
2. tenant global theme tokens
3. page-level theme overrides where allowed
4. section/slot-level overrides where allowed

Overrides are bounded by schema, not freeform.

Examples of allowed override dimensions:

- alternate accent usage
- alternate surface treatment
- alternate form emphasis mode
- alternate section image/content choice

Examples of disallowed override dimensions:

- arbitrary CSS injection
- arbitrary script injection
- arbitrary layout repositioning
- unsupported token creation

### Structured content model

Component content is edited through structured fields, not general rich text.

Examples:

- `headline`
- `subheadline`
- `bodyCopy`
- `imageAssetId`
- `ctaLabel`
- `ctaHref`
- `supportText`
- `legalText`

Each component variant declares its editable fields, field types, field validation rules, and whether the field is required, optional, tenant-editable, or platform-controlled.

### Asset model

All images and branding assets used by customizable pages and emails are platform-managed assets in v1.

The system does not allow arbitrary external image URLs in v1.

Reasons:

- reliable rendering
- CSP control
- email compatibility
- security and content governance
- future image transformation/optimization support

### Preview model

The tenant admin "Web design" editor must provide live preview as fields change.

Preview capabilities include:

- desktop view
- tablet view
- mobile view
- route/page preview
- auth-flow state preview

Only one viewport is shown at a time, with desktop as the default.

#### Auth-flow state preview requirements

Auth previews must support more than static layout.

Important preview states include:

- default sign-in
- validation error
- forgot-password entry
- OTP sent
- OTP verify
- MFA challenge
- verify-email prompt
- expired code or invalid code
- success/confirmation state

The preview system must be able to render these states using platform fixtures without requiring live Cognito interaction.

### Validation model

Validation occurs during editing and again before publish.

Validation categories include:

- schema validation
- slot compatibility validation
- capability-contract validation
- accessibility validation
- release-set consistency validation

#### Accessibility validation

At minimum, the platform should validate what it can reliably detect at preview/publish time, including:

- color contrast issues
- missing required alt or descriptive text where relevant
- missing required labels/content
- structurally missing call-to-action or navigation affordances

### Fallback model

When a tenant has not yet customized a page or theme resource, the system automatically falls back to a platform-provided default design family.

Fallback must cover:

- shell/layout
- theme tokens
- page configuration defaults
- auth page defaults
- auth email defaults

This guarantees newly approved tenants can go live with a coherent baseline before they customize.

### Registry and persistence model

The implementation should use structured persistence rather than storing opaque rendered blobs.

Representative registry-side entities:

- `design_families`
- `page_types`
- `page_slot_definitions`
- `component_families`
- `component_variants`
- `component_variant_versions`
- `component_field_schemas`
- `preview_state_fixtures`

Representative tenant-side entities:

- `tenant_business_profiles`
- `tenant_theme_configs`
- `tenant_theme_versions`
- `tenant_page_configs`
- `tenant_page_config_versions`
- `tenant_auth_shell_configs`
- `tenant_auth_page_configs`
- `tenant_release_sets`
- `tenant_release_set_items`
- `tenant_release_history`

Exact table names may differ, but the model must preserve these boundaries.

### Business profile inheritance

The system uses a shared tenant business-profile source by default for reusable identity content such as:

- business name
- logo
- support email
- support phone
- location
- footer links
- social handles

Customer pages and emails may define per-surface overrides where allowed, but the shared profile is the default source of truth.

### Admin dashboard presentation rules

The tenant admin dashboard shell is intentionally constrained.

It inherits:

- tenant logo
- business name
- selected theme tokens within platform-defined limits

It does not inherit:

- arbitrary customer-page layouts
- arbitrary component swaps
- arbitrary draft-release restyling across the whole shell

When editing a draft release:

- the editor preview pane uses the draft configuration
- the surrounding admin dashboard shell remains on the currently published theme

This avoids a self-mutating editing experience.

## Appendix B: Auth Email Customization System

This appendix defines the auth email system as a sibling customization surface to customer pages, not as a one-off template folder.

### Scope

The auth email system covers:

- signup verification
- login OTP code
- forgot password
- reset-password-related messaging where enabled
- tenant-admin setup invitation
- onboarding application emails where tenant branding is relevant

Platform-only operational emails are not part of tenant customization in v1 unless explicitly added later.

### Relationship to the broader customization system

Auth emails participate in the same major platform concepts as pages:

- design families
- tokenized theming
- structured content fields
- draft vs published
- coordinated release sets
- preview and validation
- explicit version pinning

They remain narrower than page composition because email clients are more constrained and sensitive.

### Email design-family model

A design family defines default compatible email layouts for:

- verification-code emails
- password reset emails
- login OTP emails
- invitation/setup emails

By default, a tenant's selected design family links compatible auth page and auth email variants together. Tenants may override within compatible bounds.

### Email template structure

Emails are built from bounded sections, not arbitrary HTML.

Representative section types:

- brand header
- hero/image area
- title block
- message block
- code block
- action block
- support/contact block
- legal/footer block

Tenants may swap sections only within allowed bounded templates. They cannot assemble arbitrary structures.

### Template families and variants

Each email type may have multiple variant options saved by a tenant.

The tenant may:

- keep multiple saved variants
- assign one draft candidate
- assign one active published variant per email purpose

The platform default remains available as the fallback if the tenant has no published override.

### Structured edit model

Tenant edits are limited to:

- approved section choices
- branding asset choices
- wording/content fields
- bounded token overrides where allowed
- support/contact/footer overrides where allowed

No arbitrary HTML or external embeds are allowed.

### Shared business-profile defaults

Email footer and contact data should default from the shared tenant business profile:

- business name
- support email
- support location
- store links
- social handles

Per-email-surface overrides are allowed where configured, but the shared profile remains the default source.

### Sender identity model

Email sending identity must be resolved dynamically based on:

- environment
- tenant
- email purpose
- sender readiness state

Representative sender states:

- platform default sender
- SneakerEco-managed tenant subdomain sender ready
- tenant custom-domain sender pending verification
- tenant custom-domain sender ready
- tenant sender fallback required

In early lifecycle states, auth emails should come from identities such as:

- `auth@{tenant}.sneakereco.com`

Once the tenant's custom domain sender is ready, the system may resolve to identities such as:

- `auth@{tenant-domain}`

### Rendering and transport boundary

The email layer should separate:

- template selection
- data binding
- token/theme resolution
- sender identity resolution
- final HTML/text rendering
- transport delivery

Transport choices:

- local development: SMTP to Mailpit
- production: SES-backed sending

The customization model should not depend on the transport implementation.

### Email preview model

Email previews must be stateful, not static.

The system must support preview and test-send rendering for realistic states such as:

- real code length examples
- verification code emphasis states
- fallback branding state
- family-specific light/dark visual direction
- expired or warning messaging variants where relevant
- mobile mailbox width constraints

Preview and test-send data should come from controlled fixtures and preview payload generators, not live production events.

### Email validation model

Publish-time validation for auth emails must include:

- required section presence
- required code/action block presence for the email type
- token/branding resolution completeness
- accessibility checks feasible for email
- sender identity compatibility
- structured field completeness

For example:

- a verification email must include a code presentation block
- a setup invitation email must include the required action/link content
- a tenant-branded sender cannot be selected if the sender readiness state is not valid

### Email state and publishing model

Auth email resources follow the same lifecycle model as page resources:

- draft
- published
- scheduled
- archived

They participate in coordinated release sets with themes and auth pages.

This means a tenant can publish:

- a new auth shell
- matching auth emails
- supporting theme updates

as one release.

### Version pinning

Published auth email configs are pinned to explicit variant versions. Platform updates do not mutate live tenant email output automatically.

### Fallback rules

If a tenant has not configured an auth email variant, the platform resolves to:

1. the tenant's active design family default variant if present
2. the platform default design family email variant otherwise

Fallback must also apply to sender identity. If a tenant-branded sender is not ready, the system falls back to the approved SneakerEco-managed identity for that tenant lifecycle state.

### Recommended persistence model

Representative registry-side entities:

- `email_template_families`
- `email_template_variants`
- `email_template_variant_versions`
- `email_section_schemas`
- `email_preview_fixtures`

Representative tenant-side entities:

- `tenant_email_configs`
- `tenant_email_config_versions`
- `tenant_sender_identities`
- `tenant_sender_identity_states`
- `tenant_email_test_sends`

Exact table names may differ, but the implementation must preserve these boundaries.

## Appendix C: Data Model And Schema Direction

This appendix locks the schema direction for the rebuild at the domain-boundary level. It does not require the final table names to match exactly, but it does require the final ownership boundaries to match.

### Guiding principle

The old schema is useful as reference material, but it is not the source of truth. The new schema must be shaped by the locked platform architecture, not by the previous unified-user model.

The primary schema correction is this:

- do not use one shared `users` table as the main model for admins, customers, storefront ownership, and operational actors
- do not use `tenant_members` as the shared identity bridge between admins and customers

Instead, identity, sessions, tenant configuration, and operational references must be split by responsibility.

### ID generation contract

All primary identifiers continue to use prefixed ULIDs generated application-side.

Rules:

- every major domain entity gets its own stable prefix
- prefixes must not be reused for different concepts
- old ambiguous prefixes should be retired when the underlying model has been split
- IDs are generated before insert

The existing shared ID utility should be updated to reflect the rebuilt schema rather than stretched to fit the old one.

Recommended prefix direction:

- `tnt` for `tenant`
- `adm` for `admin_user`
- `cus` for `customer_user`
- `atr` for `admin_tenant_relationship`
- `ses` for `auth_session`
- `asr` for `auth_subject_revocation`
- `slr` for `auth_session_lineage_revocation`
- `tap` for `tenant_application`
- `tsi` for `tenant_setup_invitation`
- `tbp` for `tenant_business_profile`
- `tdc` for `tenant_domain_config`
- `tcc` for `tenant_cognito_config`
- `thm` for `tenant_theme_config`
- `thv` for `tenant_theme_version`
- `pgc` for `tenant_page_config`
- `pgv` for `tenant_page_config_version`
- `ash` for `tenant_auth_shell_config`
- `apg` for `tenant_auth_page_config`
- `emc` for `tenant_email_config`
- `emv` for `tenant_email_config_version`
- `eti` for `tenant_sender_identity`
- `rls` for `tenant_release_set`
- `rlh` for `tenant_release_history`
- `dsg` for `design_family`
- `cvr` for `component_variant`
- `cvv` for `component_variant_version`
- `etv` for `email_template_variant`
- `adr` for `customer_address`
- `ord` for `order`
- `oli` for `order_line_item`
- `prd` for `product`
- `var` for `product_variant`
- `img` for `product_image`
- `ptx` for `payment_transaction`
- `evt` for `audit_event`
- `eml` for `email_audit_log`
- `whk` for `webhook_event`

Older prefixes from the previous schema such as generic `usr`, generic `mbr`, and old onboarding/theme config shortcuts should not remain the semantic source of truth if the underlying entity has changed meaning.

### Identity domains

The schema must distinguish four different identity-related concerns:

1. admin identity
2. customer identity
3. auth/session control
4. actor references for operational records

Those are related, but they are not the same thing and should not be collapsed into one table.

### Admin identity model

Use a dedicated `admin_users` domain.

Required characteristics:

- platform-scoped, not tenant-scoped
- local row created immediately when the Cognito admin user is created
- authoritative local admin role/type persisted in the database
- Cognito groups/claims must align with the local role model, but are not the only durable source of truth

Representative `admin_users` fields:

- `id`
- `email`
- `full_name`
- `cognito_sub`
- `admin_type`
- `status`
- `last_login_at` optional
- `created_at`
- `updated_at`

Representative `admin_type` values:

- `platform_admin`
- `tenant_scoped_admin`

Representative `status` values:

- `pending_setup`
- `active`
- `suspended`
- `disabled`

### Admin-tenant relationship model

Use a separate admin-to-tenant relationship table rather than a `tenant_id` column directly on `admin_users`.

This is a broader admin-tenant relationship model, even though v1 only uses one tenant-scoped role.

Representative table:

- `admin_tenant_relationships`

Representative fields:

- `id`
- `admin_user_id`
- `tenant_id`
- `relationship_type`
- `status`
- `created_at`
- `updated_at`

Representative `relationship_type` values:

- `tenant_admin`

The schema must allow future growth to more tenant-scoped admin relationship types without redesign, even if v1 uses only `tenant_admin`.

V1 enforcement:

- a tenant-scoped admin may have only one active tenant relationship
- platform admins do not require tenant relationships

### Customer identity model

Use a dedicated `customer_users` domain.

Required characteristics:

- tenant-scoped
- same email may exist in many tenants
- local row created only after successful email confirmation
- lean identity/profile linkage only

Representative `customer_users` fields:

- `id`
- `tenant_id`
- `email`
- `full_name`
- `cognito_sub`
- `status`
- `last_login_at` optional
- `created_at`
- `updated_at`

Representative `status` values:

- `active`
- `suspended`
- `disabled`

There is no global cross-tenant customer identity table in v1.

### Customer profile and preference boundaries

`customer_users` must stay lean.

Do not place broad preference or operational concerns directly on `customer_users` unless there is a strong reason. These belong in adjacent tenant-scoped tables.

Examples that should remain separate:

- address book rows
- marketing subscription state
- order email preferences
- loyalty or engagement state
- auth session state
- storefront-specific profile extensions

### Session and revocation model

Session control must use concrete session records plus revocation tables.

Representative tables:

- `auth_sessions`
- `auth_subject_revocations`
- `auth_session_lineage_revocations`

#### `auth_sessions`

This is the authoritative device/session record.

Representative fields:

- `id`
- `actor_type`
- `admin_user_id` nullable
- `customer_user_id` nullable
- `tenant_id` nullable for platform-only sessions
- `user_pool_id`
- `cognito_sub`
- `device_id`
- `refresh_token_fingerprint`
- `origin_jti`
- `status`
- `issued_at`
- `expires_at`
- `last_seen_at`
- `last_refresh_at`
- `ip_metadata`
- `user_agent`
- `revoked_at`
- `revocation_reason`
- `created_at`
- `updated_at`

Representative `actor_type` values:

- `platform_admin`
- `tenant_admin`
- `customer`

Representative `status` values:

- `active`
- `revoked`
- `expired`
- `replaced`

#### `auth_subject_revocations`

Keep the existing concept: revoke a subject before a timestamp within a user pool boundary.

This supports:

- logout all sessions for a principal
- emergency subject-wide revocation

#### `auth_session_lineage_revocations`

Keep the existing concept: revoke a token/session lineage by origin JTI and related scope.

This supports:

- targeted refresh-chain revocation
- precise invalidation of a session lineage

### Tenant core model

Keep a dedicated `tenants` table, but make its lifecycle more explicit than the old version.

Representative fields:

- `id`
- `slug`
- `display_name`
- `status`
- `launched_at`
- `created_at`
- `updated_at`

Representative `status` values:

- `provisioning`
- `setup_pending`
- `active`
- `suspended`
- `deactivated`
- `provisioning_failed`

Do not overload the root tenant row with too much operational/profile/configuration data.

### Tenant business profile

Move business-facing identity and reusable contact/branding defaults into a dedicated tenant business-profile model.

Representative table:

- `tenant_business_profiles`

Representative fields:

- `tenant_id`
- `business_name`
- `contact_name`
- `contact_email`
- `contact_phone`
- `instagram_handle`
- `logo_asset_id`
- `support_email`
- `support_phone`
- `location_summary`
- `footer_link_set`
- `social_links`

This profile becomes the shared default source for:

- customer pages
- auth emails
- tenant-facing branding

### Tenant application and setup model

Do not treat onboarding as a child row of an already-existing tenant only.

Use explicit platform lifecycle tables.

Representative tables:

- `tenant_applications`
- `tenant_setup_invitations`

#### `tenant_applications`

This exists before a tenant is necessarily fully provisioned.

Representative fields:

- `id`
- `requested_by_name`
- `requested_by_email`
- `business_name`
- `instagram_handle`
- `status`
- `reviewed_by_admin_user_id` nullable
- `reviewed_at` nullable
- `denial_reason` nullable
- `approved_tenant_id` nullable
- `created_at`
- `updated_at`

Representative `status` values:

- `submitted`
- `under_review`
- `approved`
- `denied`
- `withdrawn`

#### `tenant_setup_invitations`

This represents the SneakerEco-issued setup token/session boundary for tenant admins.

Representative fields:

- `id`
- `tenant_id`
- `admin_user_id`
- `token_hash`
- `status`
- `sent_at`
- `expires_at`
- `consumed_at`
- `revoked_at`
- `created_at`
- `updated_at`

Representative `status` values:

- `issued`
- `consumed`
- `expired`
- `revoked`

### Tenant configuration domains

Keep separate tenant configuration domains, but redesign them as versioned resources rather than single current rows.

Stable configuration domains:

- Cognito/identity configuration
- domain configuration
- business profile
- SEO configuration
- theme configuration
- page configuration
- auth shell/page configuration
- email configuration

### Tenant Cognito configuration

Keep a dedicated tenant Cognito configuration domain.

Representative table:

- `tenant_cognito_configs`

Representative fields:

- `tenant_id`
- `customer_user_pool_id`
- `customer_user_pool_arn`
- `customer_app_client_id`
- `region`
- `status`
- `created_at`
- `updated_at`

Representative `status` values:

- `provisioning`
- `ready`
- `failed`
- `rotating`

### Tenant domain configuration

Keep a dedicated tenant domain configuration domain.

Representative table:

- `tenant_domain_configs`

Representative fields:

- `tenant_id`
- `subdomain`
- `custom_domain` nullable
- `admin_custom_domain` nullable
- `dns_status`
- `ssl_status`
- `cloudflare_zone_id` nullable
- `verification_token` nullable
- `verified_at` nullable
- `created_at`
- `updated_at`

Representative `dns_status` values:

- `not_started`
- `pending_verification`
- `verified`
- `failed`

Representative `ssl_status` values:

- `not_started`
- `provisioning`
- `ready`
- `failed`

The root tenant row should not duplicate this operational domain state.

#### Locked domain rules

- tenant slug is globally unique
- once approved and created, the slug is permanently reserved
- default storefront hostname is always `{slug}.sneakereco.com`
- default admin fallback route is always `{slug}.sneakereco.com/admin`
- when a tenant brings a custom domain, the admin custom domain is always `admin.{tenant-custom-domain}`
- storefront and admin custom-domain readiness are tracked separately
- each hostname target tracks its own lifecycle:
  - `not_configured`
  - `pending_dns`
  - `verified`
  - `ssl_provisioning`
  - `ready`
  - `failed`
- a custom hostname becomes active only after that hostname reaches `ready`
- until then, the SneakerEco fallback hostname remains the operational hostname

### Cognito claim contract

The API must normalize a local principal on every authenticated request using validated token inputs plus local database state.

Required normalized token inputs:

- Cognito `sub`
- pool ID / issuer
- app client ID
- group membership
- local admin type / role claim
- `tenant_id` claim when applicable
- `session_id`
- `session_version`

Required trusted custom claims:

- `custom:admin_type`
- `custom:tenant_id` for tenant-admin tokens
- `custom:session_id`
- `custom:session_version`

Additional rules:

- tenant-admin tokens include `tenant_id` as a custom claim
- the API validates tenant claim context against the local admin-tenant relationship table
- Cognito groups are still used for coarse grouping, but not as the sole durable authorization source

### Access-token enforcement details

Access-token enforcement is not based on JWT validity alone.

Every authenticated request must validate:

- JWT validity and issuer/client expectations
- local session status
- `session_id`
- `session_version`

Access tokens carry both `session_id` and `session_version`.

Logout-all behavior:

- logout-all immediately invalidates already-issued access tokens through the local session/version enforcement path
- the platform does not wait for access-token expiry for logout-all to become effective

Locked required `auth_sessions` fields:

- `id`
- `actor_type`
- `admin_user_id`
- `customer_user_id`
- `tenant_id`
- `user_pool_id`
- `app_client_id`
- `cognito_sub`
- `device_id`
- `session_version`
- `refresh_token_fingerprint`
- `origin_jti`
- `status`
- `issued_at`
- `expires_at`
- `last_seen_at`
- `last_refresh_at`
- `ip_address` or normalized IP metadata
- `user_agent`
- `revoked_at`
- `revocation_reason`
- `created_at`
- `updated_at`

### Provisioning failure and recovery policy

Tenant approval and tenant provisioning are distinct states.

Rules:

- if approval succeeds but downstream provisioning fails, the tenant enters `provisioning_failed`
- the tenant is not considered active or ready in that state
- provisioning steps retry automatically for transient failures
- if retries are exhausted, failed work transitions to dead-letter/manual recovery handling
- manual recovery is CLI/internal-only in v1, not a platform-dashboard feature

### Queue and outbox guarantees

The queue and outbox system must support the following guarantees:

- retry policy is defined per job type, not globally
- failed jobs move to explicit dead-letter handling after retry exhaustion
- dead-letter records retain enough metadata for investigation and internal replay
- idempotency keys are required for provisioning and email jobs where duplicate execution would be harmful
- strict ordering is used only inside workflows that require it, such as tenant provisioning
- there is no blanket global ordering guarantee across all jobs

### Authorization model details

V1 uses RBAC plus a policy layer.

Locked role set:

- `platform_admin`
- `tenant_admin`
- `customer`

Finer distinctions are policy-based rather than new top-level roles in v1.

The web-builder and release workflow must still model explicit action permissions, even if `tenant_admin` currently holds them all:

- edit draft
- publish
- schedule publish
- rollback
- send test email
- edit shared business profile

### API contract shape

The API is designed as separate surfaces rather than one flat public contract.

Rules:

- BFF-facing auth endpoints and deeper internal/orchestration endpoints are separate API surfaces
- success responses are plain resource/action responses
- the API does not wrap every success payload in a generic envelope
- errors use a standardized structured format

Minimum standardized error shape:

- `code`
- `message`
- `details` optional
- `request_id`
- `field_errors` optional for validation failures

### Observability baseline

Structured logs must use a standard schema that includes at least:

- timestamp
- level
- message
- request_id
- correlation_id
- actor_type
- actor_id
- tenant_id
- session_id
- event_name
- metadata

Mandatory audit and observability event families:

- login success/failure
- logout
- refresh success/failure
- MFA setup/challenge success/failure
- OTP request/consume success/failure
- email confirmation success/failure
- password reset request/complete
- tenant application submitted/reviewed
- tenant provisioning started/succeeded/failed
- setup invitation issued/consumed/revoked
- publish/schedule/rollback actions for customization releases

Health checks and metrics must cover at least:

- API process health
- worker process health
- database connectivity
- cache connectivity
- queue connectivity
- outbox backlog visibility
- dead-letter backlog visibility
- email delivery failure counts
- provisioning failure counts
- auth failure-rate metrics

### Customization publishing permissions

In v1, any `tenant_admin` may:

- edit draft resources
- publish releases
- schedule releases
- rollback releases
- send test emails
- edit the shared business profile

The explicit action model still exists so those actions can be restricted later without redesigning the policy surface.

### Versioned design and email configuration

Do not use single current rows like the old `tenant_theme_config` or `tenant_email_config` as the long-term source of truth.

Use versioned resources and coordinated releases instead.

Representative tenant-side resources:

- `tenant_theme_configs`
- `tenant_theme_versions`
- `tenant_page_configs`
- `tenant_page_config_versions`
- `tenant_auth_shell_configs`
- `tenant_auth_page_configs`
- `tenant_email_configs`
- `tenant_email_config_versions`
- `tenant_release_sets`
- `tenant_release_set_items`
- `tenant_release_history`

Representative registry-side resources:

- `design_families`
- `page_types`
- `page_slot_definitions`
- `component_families`
- `component_variants`
- `component_variant_versions`
- `email_template_variants`
- `email_template_variant_versions`

### Address model

Keep customer addresses fully separate from `customer_users`.

Representative table:

- `customer_addresses`

Reasoning:

- addresses are multi-row operational data
- address defaults are better modeled relationally
- order address snapshots already exist separately and should remain immutable snapshots

### Order identity references

Because the old `orders` table currently points both customer and operator references at the same `users` table, the rebuild must split those references.

Future direction:

- `orders.customer_user_id` references `customer_users`
- `orders.guest_email` remains for guest or pre-account order states
- `orders.label_created_by_admin_user_id` references `admin_users`

This keeps customer ownership and admin/operator actions distinct.

### Catalog and merchandising actor references

Operational authorship on catalog and merchandising records should reference admin principals, not customer principals.

Examples:

- `products.created_by_admin_user_id`
- `featured_items.created_by_admin_user_id`

These must not continue to reference a shared generic `users` table.

### Communication identity references

Customer-facing communication records should reference customers only where there is a true customer relationship.

Examples:

- `contact_messages.customer_user_id` nullable
- `email_subscribers` remains tenant/email scoped and separate from `customer_users`
- `email_audit_log` should not depend on a shared generic user row to exist

`email_subscribers` being separate is a good pattern and should stay separate from `customer_users`.

### Audit model

Audit events should keep a flexible actor model rather than hard foreign keys to every possible actor domain.

Representative direction:

- `actor_type`
- `actor_id`
- `tenant_id` nullable where platform-global
- `event_type`
- `summary`
- `metadata`
- request metadata
- timestamps

Representative `actor_type` values should expand beyond the old shape to include the principal families the platform now recognizes:

- `platform_admin`
- `tenant_admin`
- `customer`
- `system`
- `worker`
- `webhook`

This gives the audit layer enough expressive power without forcing a brittle FK model for every event source.

### RLS implications

RLS policies must be rebuilt around the new identity model.

Key implications:

- tenant-scoped customer data uses tenant and current-customer context
- tenant-admin access uses tenant-admin relationship and tenant context
- platform-global tables are not all tenant-RLS-managed
- auth/session/platform workflow tables may need system/platform access patterns outside tenant RLS

The old `currentUserId` assumptions tied to one shared user table should not survive unchanged.

### Tables to retire or redesign from the old schema

The following old shapes should not survive unchanged:

- `users`
- `tenant_members`
- single-row `tenant_theme_config`
- single-row `tenant_email_config`
- `tenant_onboarding` in its current mixed-responsibility form

Their useful ideas should be preserved, but the ownership boundaries must change as described in this appendix.
