# Identity, Session, and Route/Domain Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved identity/session/route-domain contract across the API, database schema, tenant web app, platform app, and shared Cognito infrastructure.

**Architecture:** Keep a single Nest API and the existing two Next.js apps, but move session truth into a surface-aware API layer. The API will derive the current auth surface from the request host plus a validated `X-App-Surface` header, bind refresh/CSRF cookies to an exact surface key, and enforce revocation with persistent server-side data. Frontends will keep memory-only access tokens and migrate to canonical `/auth/*` routes while preserving old URLs as redirects.

**Tech Stack:** NestJS 11, Next.js 16, React 19, Drizzle ORM, PostgreSQL, Valkey, AWS Cognito, Terraform, pnpm, Turbo, Jest, ts-jest.

---

## File Structure

### Baseline repo repair

- Create: `apps/api/tests/jest.unit.config.js`
  Responsibility: Restore the API unit-test harness at the actual `tests/` path and allow the suite to pass cleanly before Task 1 adds the first unit tests.
- Create: `apps/api/tests/jest.integration.config.js`
  Responsibility: Restore the API integration-test harness at the actual `tests/` path so later auth integration tests run against a stable config location.
- Modify: `apps/api/package.json`
  Responsibility: Point API test scripts at the restored `tests/` configs instead of the nonexistent `test/` directory.
- Modify: `apps/api/tsconfig.json`
  Responsibility: Remove the API's fresh-checkout dependency on built sibling-package declaration output during standalone `typecheck`.
- Modify: `packages/db/package.json`
  Responsibility: Make the package type surface resolve from source in a fresh checkout instead of requiring prebuilt `dist` artifacts.
- Modify: `packages/shared/package.json`
  Responsibility: Make the shared package type surface resolve from source in a fresh checkout instead of requiring prebuilt `dist` artifacts.

### API request-surface and auth plumbing

- Create: `apps/api/src/common/context/request-surface.ts`
  Responsibility: Normalize `X-App-Surface`, resolve `hostType`, `surface`, `canonicalHost`, and `isCanonicalHost`.
- Modify: `apps/api/src/common/context/request-context.ts`
  Responsibility: Replace the coarse `origin/pool` shape with explicit surface-aware request context fields.
- Modify: `apps/api/src/common/context/request-context.middleware.ts`
  Responsibility: Populate the new request context from the request host, path, origin, and validated surface header.
- Modify: `apps/api/src/common/services/origin-resolver.service.ts`
  Responsibility: Expose domain lookups for public host, managed fallback host, and dedicated admin host.
- Modify: `apps/api/src/common/middleware/cors.middleware.ts`
  Responsibility: Continue CORS allowlisting while sharing the same hostname/domain resolution rules as request-context.
- Modify: `apps/api/src/modules/auth/auth.types.ts`
  Responsibility: Rename `tenant-admin` to `store-admin`, add Cognito revocation claims, and formalize surface/user types.
- Modify: `apps/api/src/common/guards/roles.guard.ts`
  Responsibility: Update role checks to `store-admin` while keeping `platform-admin` privileged on store-admin routes.

### API auth classification, cookies, and revocation

- Create: `apps/api/src/modules/auth/shared/pool-resolver/admin-account-classifier.service.ts`
  Responsibility: Determine whether an admin login attempt is `platform-admin`, `store-admin`, or invalid for the current surface.
- Modify: `apps/api/src/modules/auth/login/login.controller.ts`
  Responsibility: Branch on `ctx.surface` instead of `ctx.origin` and build the correct surface-keyed login response.
- Modify: `apps/api/src/modules/auth/shared/pool-resolver/pool-resolver.service.ts`
  Responsibility: Remove email-first fallback logic and select an admin client deterministically.
- Modify: `apps/api/src/modules/auth/shared/pool-resolver/pool-resolver.repository.ts`
  Responsibility: Add store-admin membership queries scoped by tenant.
- Modify: `apps/api/src/modules/auth/shared/cognito/cognito.service.ts`
  Responsibility: Add Cognito group lookup, refresh-token revocation, and admin global sign-out helpers.
- Modify: `apps/api/src/modules/auth/login/login.service.ts`
  Responsibility: Use the classifier instead of implicit admin fallback.
- Modify: `apps/api/src/modules/auth/mfa-challenge/mfa-challenge.controller.ts`
  Responsibility: Branch on `ctx.surface` and use the correct surface-keyed cookie names when issuing tokens.
- Modify: `apps/api/src/modules/auth/mfa-challenge/mfa-challenge.service.ts`
  Responsibility: Use the same deterministic admin client selection as login.
- Modify: `apps/api/src/modules/auth/mfa-setup/mfa-setup.controller.ts`
  Responsibility: Keep onboarding compatibility while moving ordinary MFA setup to surface-aware routing.
- Modify: `apps/api/src/modules/auth/mfa-setup/mfa-setup.service.ts`
  Responsibility: Complete MFA setup against the correct admin client.
- Modify: `apps/api/src/modules/auth/password-reset/password-reset.controller.ts`
  Responsibility: Allow `customer` and `store-admin` surfaces while forbidding `platform-admin`.
- Modify: `apps/api/src/modules/auth/register/register.controller.ts`
  Responsibility: Restrict register/confirm routes to the `customer` surface.
- Modify: `apps/api/src/modules/auth/otp/otp.controller.ts`
  Responsibility: Restrict OTP flows to the `customer` surface.
- Modify: `apps/api/src/modules/auth/refresh/refresh.controller.ts`
  Responsibility: Read only the current surface's refresh cookie and reject cross-surface refresh attempts.
- Modify: `apps/api/src/modules/auth/refresh/refresh.service.ts`
  Responsibility: Refresh only the current surface cookie/client combination.
- Modify: `apps/api/src/modules/auth/shared/tokens/auth-cookie.ts`
  Responsibility: Replace single cookie names with surface-keyed refresh and CSRF cookie names.
- Create: `apps/api/src/modules/auth/session-control/session-control.controller.ts`
  Responsibility: Expose `logout current session`, `revoke all my sessions`, and `platform revoke target user sessions`.
- Create: `apps/api/src/modules/auth/session-control/session-control.service.ts`
  Responsibility: Revoke refresh tokens in Cognito and persist API-side revocation state.
- Create: `apps/api/src/modules/auth/session-control/session-control.repository.ts`
  Responsibility: Read and write subject-wide cutoff timestamps and lineage revocations.
- Modify: `apps/api/src/modules/auth/logout/logout.controller.ts`
  Responsibility: Revoke only the current surface session instead of global-signing-out the whole user.
- Modify: `apps/api/src/modules/auth/logout/logout.service.ts`
  Responsibility: Delegate to the new session-control service.
- Modify: `apps/api/src/modules/auth/shared/jwt/jwt.strategy.ts`
  Responsibility: Enforce store-admin tenant membership and reject revoked access tokens.
- Modify: `apps/api/src/modules/auth/shared/jwt/jwt-strategy.repository.ts`
  Responsibility: Look up tenant-scoped membership plus revocation state.
- Modify: `apps/api/src/modules/auth/auth.module.ts`
  Responsibility: Register the new classifier and session-control providers/controllers.

### API tenant config and public host lookup

- Modify: `apps/api/src/modules/tenants/tenant-config/tenant-config.service.ts`
  Responsibility: Resolve tenant config by host as well as slug/id and return canonical routing data for redirects.
- Modify: `apps/api/src/modules/tenants/tenants.controller.ts`
  Responsibility: Accept `host` on `GET /v1/platform/config` and return routing metadata.

### Database schema

- Create: `packages/db/src/schema/identity/auth-subject-revocations.ts`
  Responsibility: Persist a `revoke_before` cutoff per Cognito subject.
- Create: `packages/db/src/schema/identity/auth-session-lineage-revocations.ts`
  Responsibility: Persist revoked `origin_jti` values with expiry.
- Modify: `packages/db/src/schema/identity/index.ts`
  Responsibility: Export the new auth revocation tables.
- Modify: `packages/shared/src/utils/id.ts`
  Responsibility: Add prefixed IDs for the new auth revocation entities.
- Modify: `packages/shared/src/types/db.ts`
  Responsibility: Export inferred types for the new tables.
- Create: `packages/db/migrations/0009_surface_bound_auth_revocation.sql`
  Responsibility: Add the new revocation tables and indexes.

### Tenant web app

- Modify: `apps/web/src/middleware.ts`
  Responsibility: Detect managed fallback hosts vs dedicated admin hosts, prepend `/admin` for dedicated admin hosts, fetch routing metadata for canonical redirects, and keep tenant slug headers for managed fallback.
- Modify: `apps/web/src/lib/api-client.ts`
  Responsibility: Send `X-App-Surface`, remove ordinary `X-Tenant-ID` auth coupling, and read surface-keyed CSRF cookies.
- Create: `apps/web/src/lib/routing/store-admin-paths.ts`
  Responsibility: Build external store-admin routes correctly for managed fallback and dedicated admin hosts.
- Modify: `apps/web/src/hooks/useAuth.ts`
  Responsibility: Use the new customer surface cookie helpers.
- Modify: `apps/web/src/components/admin/DashboardGuard.tsx`
  Responsibility: Refresh store-admin sessions without passing tenant IDs and redirect to the correct external login path.
- Create: `apps/web/src/components/auth/StoreAdminLoginForm.tsx`
  Responsibility: Replace the ambiguous admin login form with store-admin-specific semantics and external-path redirects.
- Modify: `apps/web/src/components/auth/AdminLoginForm.tsx`
  Responsibility: Re-export the new `StoreAdminLoginForm` temporarily so old imports do not break mid-migration.
- Create: `apps/web/src/components/auth/StoreAdminForgotPasswordForm.tsx`
  Responsibility: Provide store-admin self-service password reset request flow.
- Create: `apps/web/src/components/auth/StoreAdminResetPasswordForm.tsx`
  Responsibility: Provide store-admin reset-code completion flow.
- Modify: `apps/web/src/app/(storefront)/layout.tsx`
  Responsibility: Fetch tenant config by request host, not only by slug.
- Create: `apps/web/src/app/(storefront)/auth/login/page.tsx`
- Create: `apps/web/src/app/(storefront)/auth/register/page.tsx`
- Create: `apps/web/src/app/(storefront)/auth/confirm-email/page.tsx`
- Create: `apps/web/src/app/(storefront)/auth/forgot-password/page.tsx`
- Create: `apps/web/src/app/(storefront)/auth/reset-password/page.tsx`
- Create: `apps/web/src/app/(storefront)/auth/otp/page.tsx`
- Create: `apps/web/src/app/(storefront)/auth/otp/verify/page.tsx`
  Responsibility: Canonical customer `/auth/*` routes.
- Modify: `apps/web/src/app/(storefront)/login/page.tsx`
- Modify: `apps/web/src/app/(storefront)/register/page.tsx`
- Modify: `apps/web/src/app/(storefront)/verify-email/page.tsx`
- Modify: `apps/web/src/app/(storefront)/forgot-password/page.tsx`
- Modify: `apps/web/src/app/(storefront)/reset-password/page.tsx`
- Modify: `apps/web/src/app/(storefront)/otp/page.tsx`
- Modify: `apps/web/src/app/(storefront)/otp/verify/page.tsx`
  Responsibility: Redirect legacy customer URLs to canonical `/auth/*` routes.
- Create: `apps/web/src/app/admin/auth/login/page.tsx`
- Create: `apps/web/src/app/admin/auth/forgot-password/page.tsx`
- Create: `apps/web/src/app/admin/auth/reset-password/page.tsx`
  Responsibility: Canonical managed-fallback store-admin auth routes.
- Modify: `apps/web/src/app/admin/login/page.tsx`
  Responsibility: Redirect the old store-admin login URL to `/admin/auth/login`.
- Modify: `apps/web/src/app/admin/layout.tsx`
- Modify: `apps/web/src/app/admin/(dashboard)/layout.tsx`
  Responsibility: Fetch tenant config by request host and keep store-admin theming working on dedicated admin hosts.

### Platform app

- Modify: `apps/platform/src/middleware.ts`
  Responsibility: Keep dashboard host rewrites, but route external `/auth/*` to internal `/dashboard/auth/*`.
- Modify: `apps/platform/src/lib/api-client.ts`
  Responsibility: Send `X-App-Surface: platform-admin` and read surface-keyed CSRF cookies.
- Create: `apps/platform/src/app/dashboard/auth/login/page.tsx`
  Responsibility: Canonical platform-admin login route.
- Modify: `apps/platform/src/app/dashboard/login/page.tsx`
  Responsibility: Redirect the legacy URL to `/auth/login`.
- Modify: `apps/platform/src/components/platform/DashboardLoginForm.tsx`
  Responsibility: Align copy and redirects with `platform-admin`.
- Modify: `apps/platform/src/components/platform/ApprovalDashboard.tsx`
  Responsibility: Refresh and redirect using the canonical platform-admin auth route.

### Terraform and environment docs

- Create: `infra/terraform/cognito/shared-admin/versions.tf`
- Create: `infra/terraform/cognito/shared-admin/variables.tf`
- Create: `infra/terraform/cognito/shared-admin/main.tf`
- Create: `infra/terraform/cognito/shared-admin/outputs.tf`
  Responsibility: Manage the shared admin pool, both admin app clients, and both admin groups.
- Modify: `apps/api/src/config/env.schema.ts`
  Responsibility: Rename `PLATFORM_COGNITO_TENANT_ADMIN_CLIENT_ID` to `PLATFORM_COGNITO_STORE_ADMIN_CLIENT_ID` and add group names if used.
- Modify: `.env.example`
  Responsibility: Reflect Terraform-managed shared admin Cognito outputs and the renamed env vars.
- Modify: `apps/api/src/modules/tenants/cognito-provisioning.service.ts`
  Responsibility: Keep customer-pool provisioning in AWS SDK and enable token revocation on tenant customer clients.

### Tests

- Create: `apps/api/tests/jest.unit.config.js`
- Create: `apps/api/tests/jest.integration.config.js`
- Create: `apps/api/tests/unit/common/context/request-surface.spec.ts`
- Create: `apps/api/tests/unit/common/context/request-context.middleware.spec.ts`
- Create: `apps/api/tests/unit/modules/auth/shared/pool-resolver/admin-account-classifier.service.spec.ts`
- Create: `apps/api/tests/unit/modules/auth/session-control/session-control.service.spec.ts`
- Create: `apps/api/tests/unit/modules/tenants/tenant-config.service.spec.ts`
- Create: `apps/api/tests/unit/modules/tenants/cognito-provisioning.service.spec.ts`
- Create: `apps/api/tests/integration/auth/refresh-surface-isolation.spec.ts`
- Create: `apps/api/tests/integration/auth/password-reset-surface.spec.ts`
- Create: `apps/api/tests/integration/auth/revoke-all-sessions.spec.ts`

## Tasks

### Task 0: Restore The API And Workspace Baseline

**Files:**
- Create: `apps/api/tests/jest.unit.config.js`
- Create: `apps/api/tests/jest.integration.config.js`
- Modify: `apps/api/package.json`
- Modify: `apps/api/tsconfig.json`
- Modify: `packages/db/package.json`
- Modify: `packages/shared/package.json`

- [ ] **Step 1: Reproduce the current baseline failures**

Run: `pnpm --filter @sneakereco/api test:unit`

Expected: FAIL with `Can't find a root directory while resolving a config file path` because `apps/api/package.json` points Jest at `test/jest.unit.config.js` while the repo only has `tests/`.

Run: `pnpm --filter @sneakereco/shared typecheck`

Expected: FAIL with `Cannot find module '@sneakereco/db'` in a fresh checkout because `@sneakereco/db` and `@sneakereco/shared` only publish `dist` type entrypoints.

Run: `pnpm --filter @sneakereco/api typecheck`

Expected: FAIL with the same workspace-package type-resolution breakage.

- [ ] **Step 2: Restore the missing Jest configs and make workspace type entrypoints fresh-checkout safe**

```js
// apps/api/tests/jest.unit.config.js
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/unit/**/*.spec.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  passWithNoTests: true,
};
```

```js
// apps/api/tests/jest.integration.config.js
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/e2e/**/*.spec.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
```

```json
// apps/api/package.json
{
  "scripts": {
    "test:unit": "jest --config tests/jest.unit.config.js",
    "test:integration": "doppler run -- jest --config tests/jest.integration.config.js"
  }
}
```

```json
// apps/api/tsconfig.json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "nodenext",
    "outDir": "./dist",
    "rootDir": "./src",
    "tsBuildInfoFile": "./dist/.tsbuildinfo",
    "types": ["node"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.e2e-spec.ts"]
}
```

```json
// packages/db/package.json
{
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./dist/index.js"
    }
  }
}
```

```json
// packages/shared/package.json
{
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./dist/index.js"
    }
  }
}
```

- [ ] **Step 3: Verify the repaired baseline**

Run: `pnpm --filter @sneakereco/db typecheck`

Expected: PASS

Run: `pnpm --filter @sneakereco/shared typecheck`

Expected: PASS

Run: `pnpm --filter @sneakereco/api typecheck`

Expected: PASS

Run: `pnpm --filter @sneakereco/api test:unit`

Expected: PASS, either with the first real unit tests from later tasks or with `No tests found, exiting with code 0`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.json apps/api/tests/jest.unit.config.js apps/api/tests/jest.integration.config.js packages/db/package.json packages/shared/package.json
git commit -m "chore: restore workspace and api test baseline"
```

### Task 1: Formalize Shared Surface Vocabulary

**Files:**
- Create: `apps/api/tests/unit/common/context/request-surface.spec.ts`
- Create: `apps/api/src/common/context/request-surface.ts`
- Modify: `apps/api/src/modules/auth/auth.types.ts`
- Modify: `apps/api/src/common/guards/roles.guard.ts`
- Modify: `apps/api/src/modules/tenants/tenant-settings.controller.ts`

- [ ] **Step 1: Write the failing unit test for shared surface naming**

```ts
import { describe, expect, it } from '@jest/globals';

import { normalizeAppSurfaceHeader } from '../../../../src/common/context/request-surface';

describe('normalizeAppSurfaceHeader', () => {
  it('maps legacy tenant-admin to store-admin and rejects unknown values', () => {
    expect(normalizeAppSurfaceHeader('platform-admin')).toBe('platform-admin');
    expect(normalizeAppSurfaceHeader('tenant-admin')).toBe('store-admin');
    expect(normalizeAppSurfaceHeader('store-admin')).toBe('store-admin');
    expect(normalizeAppSurfaceHeader('customer')).toBe('customer');
    expect(normalizeAppSurfaceHeader('weird')).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run: `pnpm --filter @sneakereco/api test:unit -- --runTestsByPath tests/unit/common/context/request-surface.spec.ts`

Expected: FAIL with `Cannot find module '../../../../src/common/context/request-surface'` or missing Jest config.

- [ ] **Step 3: Add the new shared surface module and formalize the renamed auth vocabulary**

```ts
// apps/api/src/common/context/request-surface.ts
export type AppSurface = 'platform-admin' | 'store-admin' | 'customer' | 'unknown';
export type HostType = 'platform' | 'store-public' | 'store-admin-host' | 'unknown';

export function normalizeAppSurfaceHeader(value: string | undefined): AppSurface {
  if (value === 'tenant-admin') return 'store-admin';
  if (value === 'platform-admin' || value === 'store-admin' || value === 'customer') return value;
  return 'unknown';
}
```

```ts
// apps/api/src/modules/auth/auth.types.ts
export type UserType = 'platform-admin' | 'store-admin' | 'customer';

export interface CognitoJwtPayload {
  sub: string;
  email: string;
  iss: string;
  token_use: 'access' | 'id';
  client_id: string;
  jti?: string;
  origin_jti?: string;
  auth_time?: number;
  'cognito:groups'?: string[];
}
```

- [ ] **Step 4: Run the repaired unit test suite and a typecheck**

Run: `pnpm --filter @sneakereco/api test:unit -- --runTestsByPath tests/unit/common/context/request-surface.spec.ts`

Expected: PASS

Run: `pnpm --filter @sneakereco/api typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/tests/unit/common/context/request-surface.spec.ts apps/api/src/common/context/request-surface.ts apps/api/src/modules/auth/auth.types.ts apps/api/src/common/guards/roles.guard.ts apps/api/src/modules/tenants/tenant-settings.controller.ts
git commit -m "feat: formalize shared auth surface vocabulary"
```

### Task 2: Implement Surface-Aware Request Context And Public Tenant Config Lookup

**Files:**
- Create: `apps/api/tests/unit/common/context/request-context.middleware.spec.ts`
- Create: `apps/api/tests/unit/modules/tenants/tenant-config.service.spec.ts`
- Modify: `apps/api/src/common/context/request-context.ts`
- Modify: `apps/api/src/common/context/request-context.middleware.ts`
- Modify: `apps/api/src/common/services/origin-resolver.service.ts`
- Modify: `apps/api/src/common/middleware/cors.middleware.ts`
- Modify: `apps/api/src/modules/tenants/tenants.service.ts`
- Modify: `apps/api/src/modules/tenants/tenant-config/tenant-config.service.ts`
- Modify: `apps/api/src/modules/tenants/tenants.controller.ts`

- [ ] **Step 1: Write failing tests for host-plus-surface resolution and host-based tenant config**

```ts
describe('request surface resolution', () => {
  it('treats a managed fallback admin request as store-admin when the header says store-admin', async () => {
    expect(
      resolveRequestSurface({
        appHost: 'heatkings.sneakereco.com',
        appSurface: 'store-admin',
        tenant: { subdomain: 'heatkings', customDomain: null, adminDomain: null },
        platformHosts: { platform: 'sneakereco.com', dashboard: 'dashboard.sneakereco.com' },
      }),
    ).toMatchObject({
      hostType: 'store-public',
      surface: 'store-admin',
      canonicalHost: 'heatkings.sneakereco.com',
      isCanonicalHost: true,
    });
  });
});
```

```ts
describe('TenantConfigService.getConfig', () => {
  it('resolves a tenant by custom public host', async () => {
    await expect(service.getConfig({ host: 'heatkings.com' })).resolves.toMatchObject({
      tenant: { slug: 'heatkings' },
      routing: { canonicalCustomerHost: 'heatkings.com' },
    });
  });
});
```

- [ ] **Step 2: Run the targeted unit tests to verify they fail**

Run: `pnpm --filter @sneakereco/api test:unit -- --runTestsByPath tests/unit/common/context/request-context.middleware.spec.ts tests/unit/modules/tenants/tenant-config.service.spec.ts`

Expected: FAIL because `RequestContext` does not expose the new fields and `TenantConfigService` only accepts a slug/id string.

- [ ] **Step 3: Implement explicit surface resolution and host-aware public tenant config**

```ts
// apps/api/src/common/context/request-context.ts
export interface RequestContext {
  requestId: string;
  host: string;
  hostType: HostType;
  surface: AppSurface;
  tenantId: string | null;
  tenantSlug: string | null;
  canonicalHost: string | null;
  isCanonicalHost: boolean;
  pool: PoolCredentials | null;
  user: AuthenticatedUser | null;
}
```

```ts
// apps/api/src/common/context/request-surface.ts
export function resolveRequestSurface(input: {
  appHost: string;
  appSurface: AppSurface;
  platformHosts: { platform: string; dashboard: string };
  tenant: { subdomain: string; customDomain: string | null; adminDomain: string | null } | null;
}) {
  if (input.appHost === input.platformHosts.dashboard) {
    return { hostType: 'platform', surface: 'platform-admin', canonicalHost: input.platformHosts.dashboard, isCanonicalHost: true };
  }
  if (input.tenant?.adminDomain && input.appHost === input.tenant.adminDomain) {
    return { hostType: 'store-admin-host', surface: 'store-admin', canonicalHost: input.tenant.adminDomain, isCanonicalHost: true };
  }
  if (input.tenant && input.appHost === `${input.tenant.subdomain}.sneakereco.com`) {
    const surface = input.appSurface === 'store-admin' ? 'store-admin' : 'customer';
    const canonicalHost = surface === 'customer' && input.tenant.customDomain ? input.tenant.customDomain : input.appHost;
    return { hostType: 'store-public', surface, canonicalHost, isCanonicalHost: input.appHost === canonicalHost };
  }
  if (input.tenant?.customDomain && input.appHost === input.tenant.customDomain) {
    return { hostType: 'store-public', surface: 'customer', canonicalHost: input.tenant.customDomain, isCanonicalHost: true };
  }
  return { hostType: 'unknown', surface: 'unknown', canonicalHost: null, isCanonicalHost: false };
}
```

```ts
// apps/api/src/modules/tenants/tenants.controller.ts
@Public()
@Get('config')
getTenantConfig(@Query('host') host: string | undefined, @Query('slug') slug: string | undefined) {
  return this.tenantsService.getTenantConfig({ host, slug });
}
```

- [ ] **Step 4: Run the unit tests again**

Run: `pnpm --filter @sneakereco/api test:unit -- --runTestsByPath tests/unit/common/context/request-context.middleware.spec.ts tests/unit/modules/tenants/tenant-config.service.spec.ts`

Expected: PASS

Run: `pnpm --filter @sneakereco/api typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/context/request-context.ts apps/api/src/common/context/request-context.middleware.ts apps/api/src/common/context/request-surface.ts apps/api/src/common/services/origin-resolver.service.ts apps/api/src/common/middleware/cors.middleware.ts apps/api/src/modules/tenants/tenants.service.ts apps/api/src/modules/tenants/tenant-config/tenant-config.service.ts apps/api/src/modules/tenants/tenants.controller.ts apps/api/tests/unit/common/context/request-context.middleware.spec.ts apps/api/tests/unit/modules/tenants/tenant-config.service.spec.ts
git commit -m "feat: add surface-aware request context"
```

### Task 3: Enforce Deterministic Admin Classification And Store-Scoped Access

**Files:**
- Create: `apps/api/tests/unit/modules/auth/shared/pool-resolver/admin-account-classifier.service.spec.ts`
- Create: `apps/api/src/modules/auth/shared/pool-resolver/admin-account-classifier.service.ts`
- Modify: `apps/api/src/modules/auth/shared/pool-resolver/pool-resolver.service.ts`
- Modify: `apps/api/src/modules/auth/shared/pool-resolver/pool-resolver.repository.ts`
- Modify: `apps/api/src/modules/auth/shared/cognito/cognito.service.ts`
- Modify: `apps/api/src/modules/auth/login/login.controller.ts`
- Modify: `apps/api/src/modules/auth/login/login.service.ts`
- Modify: `apps/api/src/modules/auth/mfa-challenge/mfa-challenge.controller.ts`
- Modify: `apps/api/src/modules/auth/mfa-challenge/mfa-challenge.service.ts`
- Modify: `apps/api/src/modules/auth/mfa-setup/mfa-setup.controller.ts`
- Modify: `apps/api/src/modules/auth/mfa-setup/mfa-setup.service.ts`
- Modify: `apps/api/src/modules/auth/password-reset/password-reset.controller.ts`
- Modify: `apps/api/src/modules/auth/register/register.controller.ts`
- Modify: `apps/api/src/modules/auth/otp/otp.controller.ts`
- Modify: `apps/api/src/modules/auth/refresh/refresh.controller.ts`
- Modify: `apps/api/src/modules/auth/refresh/refresh.service.ts`
- Modify: `apps/api/src/modules/auth/shared/jwt/jwt.strategy.ts`
- Modify: `apps/api/src/modules/auth/shared/jwt/jwt-strategy.repository.ts`
- Modify: `apps/api/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Write the failing classifier tests**

```ts
describe('AdminAccountClassifierService', () => {
  it('returns store-admin only when the email has admin membership in the current tenant', async () => {
    await expect(
      service.classifyForStoreAdminSurface({ email: 'owner@heatkings.com', tenantId: 'tnt_heatkings' }),
    ).resolves.toBe('store-admin');
  });

  it('returns platform-admin for a platform operator on any store-admin surface', async () => {
    await expect(
      service.classifyForStoreAdminSurface({ email: 'jacob@sneakereco.com', tenantId: 'tnt_heatkings' }),
    ).resolves.toBe('platform-admin');
  });

  it('returns unavailable for a store admin on the wrong tenant', async () => {
    await expect(
      service.classifyForStoreAdminSurface({ email: 'owner@heatkings.com', tenantId: 'tnt_other' }),
    ).resolves.toBe('unavailable');
  });
});
```

- [ ] **Step 2: Run the classifier test to verify it fails**

Run: `pnpm --filter @sneakereco/api test:unit -- --runTestsByPath tests/unit/modules/auth/shared/pool-resolver/admin-account-classifier.service.spec.ts`

Expected: FAIL because the classifier service does not exist and `PoolResolverService` still uses email-first fallback.

- [ ] **Step 3: Implement explicit admin account classification and tenant-scoped JWT membership checks**

```ts
// apps/api/src/modules/auth/shared/pool-resolver/admin-account-classifier.service.ts
export type AdminAudience = 'platform-admin' | 'store-admin' | 'unavailable';

async classifyForStoreAdminSurface(input: { email: string; tenantId: string }): Promise<AdminAudience> {
  const groups = await this.cognito.getUserGroups(input.email, this.platformPoolId);
  const isPlatformAdmin = groups.includes('platform-admin');
  const hasStoreMembership = await this.repository.hasStoreAdminMembership(input.tenantId, input.email);

  if (hasStoreMembership) return 'store-admin';
  if (isPlatformAdmin) return 'platform-admin';
  return 'unavailable';
}
```

```ts
// apps/api/src/modules/auth/shared/jwt/jwt.strategy.ts
if (payload.client_id === this.storeAdminClientId) {
  const membership = await this.resolveMembership(payload.sub, ctx?.tenantId ?? null);
  if (!membership) {
    throw new UnauthorizedException('Authentication required');
  }
  return {
    cognitoSub: payload.sub,
    email: payload.email,
    isSuperAdmin: false,
    tenantId: membership.tenantId,
    memberId: membership.memberId,
    userType: 'store-admin',
    teamRole: membership.teamRole,
    jti: payload.jti ?? null,
  };
}
```

```ts
// apps/api/src/modules/auth/login/login.controller.ts
const surface = ctx?.surface;
if (surface === 'platform-admin') {
  const result = await this.loginService.login(dto, { surface: 'platform-admin' });
  return buildLoginResponse(request, response, this.security, this.csrfService, result, 'platform-admin');
}
if (surface === 'store-admin') {
  const result = await this.loginService.login(dto, { surface: 'store-admin', tenantId: ctx?.tenantId ?? null });
  return buildLoginResponse(request, response, this.security, this.csrfService, result, 'store-admin');
}
if (surface === 'customer') {
  const result = await this.loginService.login(dto, { surface: 'customer', pool: ctx?.pool ?? null });
  return buildLoginResponse(request, response, this.security, this.csrfService, result, 'customer');
}
throw new BadRequestException('Origin not allowed');
```

```ts
// apps/api/src/modules/auth/password-reset/password-reset.controller.ts
const surface = RequestCtx.get()?.surface;
if (surface === 'platform-admin') {
  throw new ForbiddenException('Platform accounts use admin-managed password reset');
}
if (surface !== 'customer' && surface !== 'store-admin') {
  throw new BadRequestException('Origin not allowed');
}
```

- [ ] **Step 4: Run the classifier test and a focused auth typecheck**

Run: `pnpm --filter @sneakereco/api test:unit -- --runTestsByPath tests/unit/modules/auth/shared/pool-resolver/admin-account-classifier.service.spec.ts`

Expected: PASS

Run: `pnpm --filter @sneakereco/api typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/shared/pool-resolver/admin-account-classifier.service.ts apps/api/src/modules/auth/shared/pool-resolver/pool-resolver.service.ts apps/api/src/modules/auth/shared/pool-resolver/pool-resolver.repository.ts apps/api/src/modules/auth/shared/cognito/cognito.service.ts apps/api/src/modules/auth/login/login.controller.ts apps/api/src/modules/auth/login/login.service.ts apps/api/src/modules/auth/mfa-challenge/mfa-challenge.controller.ts apps/api/src/modules/auth/mfa-challenge/mfa-challenge.service.ts apps/api/src/modules/auth/mfa-setup/mfa-setup.controller.ts apps/api/src/modules/auth/mfa-setup/mfa-setup.service.ts apps/api/src/modules/auth/password-reset/password-reset.controller.ts apps/api/src/modules/auth/register/register.controller.ts apps/api/src/modules/auth/otp/otp.controller.ts apps/api/src/modules/auth/refresh/refresh.controller.ts apps/api/src/modules/auth/refresh/refresh.service.ts apps/api/src/modules/auth/shared/jwt/jwt.strategy.ts apps/api/src/modules/auth/shared/jwt/jwt-strategy.repository.ts apps/api/src/modules/auth/auth.module.ts apps/api/tests/unit/modules/auth/shared/pool-resolver/admin-account-classifier.service.spec.ts
git commit -m "feat: enforce explicit store admin audience selection"
```

### Task 4: Add Persistent Revocation State And Surface-Keyed Cookies

**Files:**
- Create: `packages/db/src/schema/identity/auth-subject-revocations.ts`
- Create: `packages/db/src/schema/identity/auth-session-lineage-revocations.ts`
- Create: `packages/db/migrations/0009_surface_bound_auth_revocation.sql`
- Create: `apps/api/src/modules/auth/session-control/session-control.controller.ts`
- Create: `apps/api/src/modules/auth/session-control/session-control.service.ts`
- Create: `apps/api/src/modules/auth/session-control/session-control.repository.ts`
- Create: `apps/api/tests/unit/modules/auth/session-control/session-control.service.spec.ts`
- Create: `apps/api/tests/integration/auth/refresh-surface-isolation.spec.ts`
- Create: `apps/api/tests/integration/auth/password-reset-surface.spec.ts`
- Create: `apps/api/tests/integration/auth/revoke-all-sessions.spec.ts`
- Modify: `packages/db/src/schema/identity/index.ts`
- Modify: `packages/shared/src/utils/id.ts`
- Modify: `packages/shared/src/types/db.ts`
- Modify: `apps/api/src/modules/auth/shared/tokens/auth-cookie.ts`
- Modify: `apps/api/src/modules/auth/refresh/refresh.controller.ts`
- Modify: `apps/api/src/modules/auth/logout/logout.controller.ts`
- Modify: `apps/api/src/modules/auth/logout/logout.service.ts`
- Modify: `apps/api/src/modules/auth/shared/cognito/cognito.service.ts`
- Modify: `apps/api/src/modules/auth/shared/jwt/jwt.strategy.ts`
- Modify: `apps/api/src/modules/auth/shared/jwt/jwt-strategy.repository.ts`
- Modify: `apps/api/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Write the failing unit and integration tests**

```ts
describe('surface cookie names', () => {
  it('produces a unique refresh cookie per surface key', () => {
    expect(buildSurfaceCookieNames('store-admin:admin.heatkings.com').refresh).toBe(
      '__Secure-sneakereco-refresh-store-admin-admin-heatkings-com',
    );
  });
});
```

```ts
it('rejects a customer refresh cookie on the store-admin surface', async () => {
  await request(app.getHttpServer())
    .post('/v1/auth/refresh')
    .set('Origin', 'https://heatkings.sneakereco.com')
    .set('X-App-Surface', 'store-admin')
    .set('Cookie', '__Secure-sneakereco-refresh-customer-heatkings-sneakereco-com=abc')
    .expect(401);
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `pnpm --filter @sneakereco/api test:unit -- --runTestsByPath tests/unit/modules/auth/session-control/session-control.service.spec.ts`

Expected: FAIL because the new tables, repository, and cookie helper do not exist.

Run: `pnpm --filter @sneakereco/api test:integration -- --runTestsByPath tests/integration/auth/refresh-surface-isolation.spec.ts`

Expected: FAIL because `/auth/refresh` still reads a single shared cookie name.

- [ ] **Step 3: Implement revocation tables, surface-keyed cookies, and session-control endpoints**

```ts
// packages/db/src/schema/identity/auth-session-lineage-revocations.ts
export const authSessionLineageRevocations = pgTable(
  'auth_session_lineage_revocations',
  {
    id: text('id').primaryKey(),
    cognitoSub: text('cognito_sub').notNull(),
    userPoolId: text('user_pool_id').notNull(),
    originJti: text('origin_jti').notNull(),
    surfaceKey: text('surface_key').notNull(),
    expiresAt: timestamptz('expires_at').notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
);
```

```ts
// apps/api/src/modules/auth/shared/tokens/auth-cookie.ts
export function buildSurfaceCookieNames(surfaceKey: string) {
  const suffix = surfaceKey.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    refresh: `__Secure-sneakereco-refresh-${suffix}`,
    csrf: `__Secure-sneakereco-csrf-${suffix}`,
  };
}
```

```ts
// apps/api/src/modules/auth/session-control/session-control.service.ts
async revokeCurrentSession(input: {
  cognitoSub: string;
  userPoolId: string;
  originJti: string | null;
  refreshToken: string | null;
  pool: PoolCredentials;
  surfaceKey: string;
}) {
  if (input.refreshToken) {
    await this.cognito.revokeToken(input.refreshToken, input.pool.clientId);
  }
  if (input.originJti) {
    await this.repository.insertLineageRevocation(input);
  }
}
```

- [ ] **Step 4: Run the focused unit and integration suites**

Run: `pnpm --filter @sneakereco/api test:unit -- --runTestsByPath tests/unit/modules/auth/session-control/session-control.service.spec.ts`

Expected: PASS

Run: `pnpm --filter @sneakereco/api test:integration -- --runTestsByPath tests/integration/auth/refresh-surface-isolation.spec.ts tests/integration/auth/password-reset-surface.spec.ts tests/integration/auth/revoke-all-sessions.spec.ts`

Expected: PASS

Run: `pnpm --filter @sneakereco/db typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/identity/auth-subject-revocations.ts packages/db/src/schema/identity/auth-session-lineage-revocations.ts packages/db/src/schema/identity/index.ts packages/db/migrations/0009_surface_bound_auth_revocation.sql packages/shared/src/utils/id.ts packages/shared/src/types/db.ts apps/api/src/modules/auth/shared/tokens/auth-cookie.ts apps/api/src/modules/auth/refresh/refresh.controller.ts apps/api/src/modules/auth/session-control/session-control.controller.ts apps/api/src/modules/auth/session-control/session-control.service.ts apps/api/src/modules/auth/session-control/session-control.repository.ts apps/api/src/modules/auth/logout/logout.controller.ts apps/api/src/modules/auth/logout/logout.service.ts apps/api/src/modules/auth/shared/cognito/cognito.service.ts apps/api/src/modules/auth/shared/jwt/jwt.strategy.ts apps/api/src/modules/auth/shared/jwt/jwt-strategy.repository.ts apps/api/src/modules/auth/auth.module.ts apps/api/tests/unit/modules/auth/session-control/session-control.service.spec.ts apps/api/tests/integration/auth/refresh-surface-isolation.spec.ts apps/api/tests/integration/auth/password-reset-surface.spec.ts apps/api/tests/integration/auth/revoke-all-sessions.spec.ts
git commit -m "feat: add surface-bound auth revocation"
```

### Task 5: Migrate The Tenant Web App To Canonical `/auth/*` Routes

**Files:**
- Create: `apps/web/src/components/auth/StoreAdminForgotPasswordForm.tsx`
- Create: `apps/web/src/components/auth/StoreAdminResetPasswordForm.tsx`
- Create: `apps/web/src/components/auth/StoreAdminLoginForm.tsx`
- Create: `apps/web/src/app/(storefront)/auth/login/page.tsx`
- Create: `apps/web/src/app/(storefront)/auth/register/page.tsx`
- Create: `apps/web/src/app/(storefront)/auth/confirm-email/page.tsx`
- Create: `apps/web/src/app/(storefront)/auth/forgot-password/page.tsx`
- Create: `apps/web/src/app/(storefront)/auth/reset-password/page.tsx`
- Create: `apps/web/src/app/(storefront)/auth/otp/page.tsx`
- Create: `apps/web/src/app/(storefront)/auth/otp/verify/page.tsx`
- Create: `apps/web/src/app/admin/auth/login/page.tsx`
- Create: `apps/web/src/app/admin/auth/forgot-password/page.tsx`
- Create: `apps/web/src/app/admin/auth/reset-password/page.tsx`
- Modify: `apps/web/src/middleware.ts`
- Modify: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/lib/routing/store-admin-paths.ts`
- Modify: `apps/web/src/hooks/useAuth.ts`
- Modify: `apps/web/src/components/admin/DashboardGuard.tsx`
- Modify: `apps/web/src/components/auth/AdminLoginForm.tsx`
- Modify: `apps/web/src/app/(storefront)/layout.tsx`
- Modify: `apps/web/src/app/(storefront)/login/page.tsx`
- Modify: `apps/web/src/app/(storefront)/register/page.tsx`
- Modify: `apps/web/src/app/(storefront)/verify-email/page.tsx`
- Modify: `apps/web/src/app/(storefront)/forgot-password/page.tsx`
- Modify: `apps/web/src/app/(storefront)/reset-password/page.tsx`
- Modify: `apps/web/src/app/(storefront)/otp/page.tsx`
- Modify: `apps/web/src/app/(storefront)/otp/verify/page.tsx`
- Modify: `apps/web/src/app/admin/login/page.tsx`
- Modify: `apps/web/src/app/admin/layout.tsx`
- Modify: `apps/web/src/app/admin/(dashboard)/layout.tsx`

- [ ] **Step 1: Add the canonical customer and store-admin auth route wrappers**

```tsx
// apps/web/src/app/(storefront)/auth/login/page.tsx
import { CustomerLoginForm } from '../../../../components/auth/customer/CustomerLoginForm';

export default function CustomerAuthLoginPage() {
  return <CustomerLoginForm />;
}
```

```tsx
// apps/web/src/app/admin/auth/login/page.tsx
import { StoreAdminLoginForm } from '../../../../components/auth/StoreAdminLoginForm';

export default function StoreAdminAuthLoginPage() {
  return <StoreAdminLoginForm />;
}
```

- [ ] **Step 2: Replace legacy auth pages with redirects**

```tsx
// apps/web/src/app/(storefront)/login/page.tsx
import { redirect } from 'next/navigation';

export default function LegacyCustomerLoginRedirect() {
  redirect('/auth/login');
}
```

```tsx
// apps/web/src/app/admin/login/page.tsx
import { redirect } from 'next/navigation';

export default function LegacyStoreAdminLoginRedirect() {
  redirect('/admin/auth/login');
}
```

- [ ] **Step 3: Make middleware and API clients surface-aware**

```ts
// apps/web/src/middleware.ts
if (host.startsWith('admin.') && !host.endsWith('.sneakereco.com') && !host.endsWith('.sneakereco.test')) {
  const url = request.nextUrl.clone();
  url.pathname = `/admin${url.pathname === '/' ? '' : url.pathname}`;
  return NextResponse.rewrite(url);
}

const config = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/platform/config?host=${encodeURIComponent(host)}`, {
  headers: { 'X-App-Surface': host.startsWith('admin.') ? 'store-admin' : 'customer' },
  cache: 'no-store',
}).then((res) => (res.ok ? res.json() : null));

if (config?.data?.routing?.canonicalHost && !config.data.routing.isCanonicalHost) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.host = config.data.routing.canonicalHost;
  return NextResponse.redirect(redirectUrl);
}
```

```ts
// apps/web/src/lib/api-client.ts
interface RequestOptions extends Omit<RequestInit, 'body'> {
  accessToken?: string;
  appSurface?: 'customer' | 'store-admin';
  body?: unknown;
  csrfToken?: string | null;
}

if (appSurface) {
  requestHeaders.set('X-App-Surface', appSurface);
}
```

```ts
// apps/web/src/lib/routing/store-admin-paths.ts
export function getStoreAdminExternalPath(pathname: string, host: string): string {
  return host.startsWith('admin.') ? pathname : `/admin${pathname === '/' ? '' : pathname}`;
}
```

- [ ] **Step 4: Verify the web app build contract**

Run: `pnpm --filter @sneakereco/web typecheck`

Expected: PASS

Run: `pnpm --filter @sneakereco/web lint`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/middleware.ts apps/web/src/lib/api-client.ts apps/web/src/lib/routing/store-admin-paths.ts apps/web/src/hooks/useAuth.ts apps/web/src/components/admin/DashboardGuard.tsx apps/web/src/components/auth/AdminLoginForm.tsx apps/web/src/components/auth/StoreAdminLoginForm.tsx apps/web/src/components/auth/StoreAdminForgotPasswordForm.tsx apps/web/src/components/auth/StoreAdminResetPasswordForm.tsx apps/web/src/app/(storefront)/layout.tsx apps/web/src/app/(storefront)/auth/login/page.tsx apps/web/src/app/(storefront)/auth/register/page.tsx apps/web/src/app/(storefront)/auth/confirm-email/page.tsx apps/web/src/app/(storefront)/auth/forgot-password/page.tsx apps/web/src/app/(storefront)/auth/reset-password/page.tsx apps/web/src/app/(storefront)/auth/otp/page.tsx apps/web/src/app/(storefront)/auth/otp/verify/page.tsx apps/web/src/app/(storefront)/login/page.tsx apps/web/src/app/(storefront)/register/page.tsx apps/web/src/app/(storefront)/verify-email/page.tsx apps/web/src/app/(storefront)/forgot-password/page.tsx apps/web/src/app/(storefront)/reset-password/page.tsx apps/web/src/app/(storefront)/otp/page.tsx apps/web/src/app/(storefront)/otp/verify/page.tsx apps/web/src/app/admin/auth/login/page.tsx apps/web/src/app/admin/auth/forgot-password/page.tsx apps/web/src/app/admin/auth/reset-password/page.tsx apps/web/src/app/admin/login/page.tsx apps/web/src/app/admin/layout.tsx apps/web/src/app/admin/(dashboard)/layout.tsx
git commit -m "feat: migrate tenant web auth routes"
```

### Task 6: Migrate The Platform App To Canonical Platform-Admin Auth Routes

**Files:**
- Create: `apps/platform/src/app/dashboard/auth/login/page.tsx`
- Modify: `apps/platform/src/middleware.ts`
- Modify: `apps/platform/src/lib/api-client.ts`
- Modify: `apps/platform/src/app/dashboard/login/page.tsx`
- Modify: `apps/platform/src/components/platform/DashboardLoginForm.tsx`
- Modify: `apps/platform/src/components/platform/ApprovalDashboard.tsx`

- [ ] **Step 1: Add the canonical platform-admin login page**

```tsx
// apps/platform/src/app/dashboard/auth/login/page.tsx
import { DashboardLoginForm } from '../../../../components/platform/DashboardLoginForm';

export default function PlatformAdminAuthLoginPage() {
  return <DashboardLoginForm />;
}
```

- [ ] **Step 2: Redirect the legacy dashboard login URL**

```tsx
// apps/platform/src/app/dashboard/login/page.tsx
import { redirect } from 'next/navigation';

export default function LegacyDashboardLoginRedirect() {
  redirect('/auth/login');
}
```

- [ ] **Step 3: Update middleware and the API client to the platform-admin surface**

```ts
// apps/platform/src/middleware.ts
if (hostname.startsWith('dashboard.')) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname === '/' ? '' : url.pathname;
  url.pathname = `/dashboard${pathname}`;
  return NextResponse.rewrite(url);
}
```

```ts
// apps/platform/src/lib/api-client.ts
if (!requestHeaders.has('X-App-Surface')) {
  requestHeaders.set('X-App-Surface', 'platform-admin');
}
```

- [ ] **Step 4: Verify the platform app contract**

Run: `pnpm --filter @sneakereco/platform typecheck`

Expected: PASS

Run: `pnpm --filter @sneakereco/platform lint`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/platform/src/middleware.ts apps/platform/src/lib/api-client.ts apps/platform/src/app/dashboard/auth/login/page.tsx apps/platform/src/app/dashboard/login/page.tsx apps/platform/src/components/platform/DashboardLoginForm.tsx apps/platform/src/components/platform/ApprovalDashboard.tsx
git commit -m "feat: migrate platform admin auth routes"
```

### Task 7: Add Terraform-Managed Shared Admin Cognito And Finalize Environment Wiring

**Files:**
- Create: `infra/terraform/cognito/shared-admin/versions.tf`
- Create: `infra/terraform/cognito/shared-admin/variables.tf`
- Create: `infra/terraform/cognito/shared-admin/main.tf`
- Create: `infra/terraform/cognito/shared-admin/outputs.tf`
- Create: `apps/api/tests/unit/modules/tenants/cognito-provisioning.service.spec.ts`
- Modify: `apps/api/src/config/env.schema.ts`
- Modify: `.env.example`
- Modify: `apps/api/src/modules/tenants/cognito-provisioning.service.ts`

- [ ] **Step 1: Write the failing provisioning unit test for tenant customer clients**

```ts
it('enables token revocation when creating a tenant customer app client', async () => {
  await service.createTenantCustomerPool({ businessName: 'Heat Kings', subdomain: 'heatkings' });
  expect(mockClient.send).toHaveBeenCalledWith(
    expect.objectContaining({
      input: expect.objectContaining({
        EnableTokenRevocation: true,
        AccessTokenValidity: 60,
        RefreshTokenValidity: 30,
      }),
    }),
  );
});
```

- [ ] **Step 2: Run the provisioning unit test to verify it fails**

Run: `pnpm --filter @sneakereco/api test:unit -- --runTestsByPath tests/unit/modules/tenants/cognito-provisioning.service.spec.ts`

Expected: FAIL because the service does not enable token revocation and the new env names are not present.

- [ ] **Step 3: Add the Terraform scaffold and update environment wiring**

```hcl
# infra/terraform/cognito/shared-admin/main.tf
resource "aws_cognito_user_pool_client" "platform_admin" {
  name                    = "platform-admin"
  user_pool_id            = aws_cognito_user_pool.shared_admin.id
  access_token_validity   = 30
  id_token_validity       = 30
  refresh_token_validity  = 1
  auth_session_validity   = 10
  enable_token_revocation = true
}

resource "aws_cognito_user_pool_client" "store_admin" {
  name                    = "store-admin"
  user_pool_id            = aws_cognito_user_pool.shared_admin.id
  access_token_validity   = 30
  id_token_validity       = 30
  refresh_token_validity  = 1
  auth_session_validity   = 10
  enable_token_revocation = true
}
```

```ts
// apps/api/src/modules/tenants/cognito-provisioning.service.ts
new CreateUserPoolClientCommand({
  UserPoolId: userPoolId,
  ClientName: 'customer',
  EnableTokenRevocation: true,
  RefreshTokenValidity: 30,
  AccessTokenValidity: 60,
  IdTokenValidity: 60,
});
```

```ts
// apps/api/src/config/env.schema.ts
PLATFORM_COGNITO_STORE_ADMIN_CLIENT_ID: z.string().min(1),
PLATFORM_COGNITO_PLATFORM_ADMIN_GROUP_NAME: z.string().default('platform-admin'),
PLATFORM_COGNITO_STORE_ADMIN_GROUP_NAME: z.string().default('store-admin'),
```

- [ ] **Step 4: Run the final verification commands**

Run: `pnpm --filter @sneakereco/db typecheck`

Expected: PASS

Run: `pnpm --filter @sneakereco/shared typecheck`

Expected: PASS

Run: `pnpm --filter @sneakereco/api test:unit`

Expected: PASS

Run: `pnpm --filter @sneakereco/api typecheck`

Expected: PASS

Run: `pnpm --filter @sneakereco/web typecheck`

Expected: PASS

Run: `pnpm --filter @sneakereco/platform typecheck`

Expected: PASS

Run: `terraform -chdir=infra/terraform/cognito/shared-admin validate`

Expected: PASS with `Success! The configuration is valid.`

- [ ] **Step 5: Commit**

```bash
git add infra/terraform/cognito/shared-admin/versions.tf infra/terraform/cognito/shared-admin/variables.tf infra/terraform/cognito/shared-admin/main.tf infra/terraform/cognito/shared-admin/outputs.tf apps/api/src/config/env.schema.ts .env.example apps/api/src/modules/tenants/cognito-provisioning.service.ts apps/api/tests/unit/modules/tenants/cognito-provisioning.service.spec.ts
git commit -m "infra: add terraform-managed shared admin cognito"
```
