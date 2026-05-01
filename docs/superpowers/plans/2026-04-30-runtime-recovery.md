# Runtime Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the repository to a trustworthy green baseline where `api`, `web`, and `platform` build and typecheck, API unit and integration tests pass, and the tenant/platform auth BFF surfaces compile against the right contracts.

**Architecture:** Fix the repo in the order the failures currently appear: verification harness first, API compile graph second, tenant auth-shell contracts third, and BFF/platform auth wiring fourth. Allow tactical structural cleanup only when the current file placement or naming drift is itself the source of the failure.

**Tech Stack:** pnpm workspace, NestJS, Fastify, Jest, TypeScript, Next.js

---

## File Structure

**Create:**
- `apps/api/src/modules/platform-onboarding/review-application.dto.ts`
- `apps/web/src/components/auth/web-design-studio.tsx`

**Move/Rename:**
- `apps/api/src/modules/admin-access/admin-acess.module.ts` -> `apps/api/src/modules/admin-access/admin-access.module.ts`
- `apps/api/src/core/cognito/cognito-tenant-factor.ts` -> `apps/api/src/core/cognito/cognito-tenant-factory.service.ts`
- `apps/platform/src/lib/auth/principal-codex.ts` -> `apps/platform/src/lib/auth/principal-codec.ts`

**Modify:**
- `apps/api/tests/jest.unit.config.js`
- `apps/api/tests/jest.integration.config.js`
- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `apps/api/src/core/cognito/cognito.module.ts`
- `apps/api/src/modules/platform-onboarding/review.controller.ts`
- `apps/api/src/modules/tenants/tenant-provisioning.gateway.ts`
- `apps/web/src/components/auth/auth-shell.tsx`
- `apps/web/src/components/auth/auth-form.tsx`
- `apps/web/src/components/auth/admin-setup-flow.tsx`
- `apps/web/src/app/api/auth/me/route.ts`
- `apps/platform/src/lib/auth/bff.ts`
- `apps/platform/src/components/platform-auth/platform-auth-form.tsx`

## Task 1: Repair Workspace Resolution For API Tests

**Files:**
- Modify: `apps/api/tests/jest.unit.config.js`
- Modify: `apps/api/tests/jest.integration.config.js`
- Test: `apps/api/tests/unit/modules/auth/shared/session-enforcement.service.spec.ts`
- Test: `apps/api/tests/integration/modules/auth/auth.flow.spec.ts`

- [ ] **Step 1: Add workspace package mapping to the unit Jest config**

```js
/** @type {import('jest').Config} */
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@sneakereco/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@sneakereco/db$': '<rootDir>/../../packages/db/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tests/tsconfig.json',
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts'],
};
```

- [ ] **Step 2: Add the same workspace mapping to the integration Jest config**

```js
/** @type {import('jest').Config} */
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@sneakereco/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@sneakereco/db$': '<rootDir>/../../packages/db/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tests/tsconfig.json',
      },
    ],
  },
};
```

- [ ] **Step 3: Run the unit suite to confirm `@sneakereco/shared` resolution is fixed**

Run:

```bash
pnpm --filter @sneakereco/api test:unit
```

Expected:

```text
No Jest failure should mention "Cannot find module '@sneakereco/shared'".
```

- [ ] **Step 4: Run the integration suite to confirm package resolution is fixed there too**

Run:

```bash
pnpm --filter @sneakereco/api test:integration
```

Expected:

```text
No Jest failure should mention "Cannot find module '@sneakereco/shared'".
```

- [ ] **Step 5: Commit the harness fix**

```bash
git add apps/api/tests/jest.unit.config.js apps/api/tests/jest.integration.config.js
git commit -m "test: map workspace packages in api jest configs"
```

## Task 2: Stabilize The API Compile Graph And Bootstrap Wiring

**Files:**
- Create: `apps/api/src/modules/platform-onboarding/review-application.dto.ts`
- Move/Rename: `apps/api/src/modules/admin-access/admin-acess.module.ts` -> `apps/api/src/modules/admin-access/admin-access.module.ts`
- Move/Rename: `apps/api/src/core/cognito/cognito-tenant-factor.ts` -> `apps/api/src/core/cognito/cognito-tenant-factory.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/core/cognito/cognito.module.ts`
- Modify: `apps/api/src/modules/platform-onboarding/review.controller.ts`
- Modify: `apps/api/src/modules/tenants/tenant-provisioning.gateway.ts`
- Test: `apps/api/tests/integration/operations/hardening-and-ops.spec.ts`
- Test: `apps/api/tests/integration/modules/web-builder/web-builder.flows.spec.ts`

- [ ] **Step 1: Rename the misnamed API module and Cognito factory files so imports match reality**

Run:

```bash
git mv apps/api/src/modules/admin-access/admin-acess.module.ts apps/api/src/modules/admin-access/admin-access.module.ts
git mv apps/api/src/core/cognito/cognito-tenant-factor.ts apps/api/src/core/cognito/cognito-tenant-factory.service.ts
```

Expected:

```text
git status should show two renamed files and no deleted orphan left behind.
```

- [ ] **Step 2: Restore the missing review DTO contract**

Create `apps/api/src/modules/platform-onboarding/review-application.dto.ts`:

```ts
export class ApproveApplicationDto {
  reviewedByAdminUserId!: string;
}

export class DenyApplicationDto {
  reviewedByAdminUserId!: string;
  reason!: string;
}
```

- [ ] **Step 3: Align the API imports with the renamed files**

Update these import sites:

```ts
// apps/api/src/app.module.ts
import { AdminAccessModule } from './modules/admin-access/admin-access.module';

// apps/api/src/core/cognito/cognito.module.ts
import { CognitoTenantFactoryService } from './cognito-tenant-factory.service';

// apps/api/src/modules/tenants/tenant-provisioning.gateway.ts
import { CognitoTenantFactoryService } from '../../core/cognito/cognito-tenant-factory.service';

// apps/api/src/modules/platform-onboarding/review.controller.ts
import type { ApproveApplicationDto, DenyApplicationDto } from './review-application.dto';
```

- [ ] **Step 4: Fix `main.ts` so CORS tenant-origin lookup comes from Nest DI instead of an undeclared variable**

Replace the top of `bootstrap()` with:

```ts
const app = await NestFactory.create<NestFastifyApplication>(
  HttpAppModule,
  new FastifyAdapter({ logger: false }),
);
const securityService = app.get(SecurityService);
const requestContextService = app.get(RequestContextService);
const logger = app.get(LoggerService);
const tenantDomainConfigRepository = app.get(TenantDomainConfigRepository);
```

And type the async callback branch explicitly:

```ts
void tenantDomainConfigRepository
  .findByOriginHost(parsed.hostname)
  .then((tenantOrigin: unknown) => callback(null, Boolean(tenantOrigin)))
  .catch(() => callback(null, false));
```

- [ ] **Step 5: Run API typecheck to confirm the module graph is coherent**

Run:

```bash
pnpm --filter @sneakereco/api typecheck
```

Expected:

```text
PASS with no missing-module errors for admin-access, cognito tenant factory, review DTOs, or main.ts bootstrap wiring.
```

- [ ] **Step 6: Run the integration suites that currently fail on the broken API graph**

Run:

```bash
pnpm --filter @sneakereco/api test:integration -- tests/integration/operations/hardening-and-ops.spec.ts
pnpm --filter @sneakereco/api test:integration -- tests/integration/modules/web-builder/web-builder.flows.spec.ts
```

Expected:

```text
These suites should no longer fail on missing `cognito-tenant-factory.service` imports.
```

- [ ] **Step 7: Commit the API runtime recovery**

```bash
git add apps/api/src/app.module.ts apps/api/src/main.ts apps/api/src/core/cognito/cognito.module.ts apps/api/src/core/cognito/cognito-tenant-factory.service.ts apps/api/src/modules/admin-access/admin-access.module.ts apps/api/src/modules/platform-onboarding/review-application.dto.ts apps/api/src/modules/platform-onboarding/review.controller.ts apps/api/src/modules/tenants/tenant-provisioning.gateway.ts
git commit -m "fix: recover api runtime module graph"
```

## Task 3: Restore The Tenant Auth Shell Contract And Separate Editor UI

**Files:**
- Create: `apps/web/src/components/auth/web-design-studio.tsx`
- Modify: `apps/web/src/components/auth/auth-shell.tsx`
- Modify: `apps/web/src/components/auth/auth-form.tsx`
- Modify: `apps/web/src/components/auth/admin-setup-flow.tsx`
- Test: `apps/web/src/app/(tenant-auth)/login/page.tsx`
- Test: `apps/web/src/app/account/page.tsx`

- [ ] **Step 1: Move the design-studio component out of `auth-shell.tsx`**

Run:

```bash
Copy-Item apps/web/src/components/auth/auth-shell.tsx apps/web/src/components/auth/web-design-studio.tsx
```

Then rename the export in `apps/web/src/components/auth/web-design-studio.tsx` so the file keeps:

```tsx
export function WebDesignStudio() {
```

- [ ] **Step 2: Replace `auth-shell.tsx` with the actual auth-shell exports the tenant pages expect**

Write `apps/web/src/components/auth/auth-shell.tsx` as:

```tsx
import type { ReactNode } from 'react';

function shellClasses(family: 'a' | 'b') {
  return family === 'b'
    ? {
        page: 'min-h-screen bg-[#050505] text-white',
        card: 'border border-white/10 bg-[#0d0d10]',
        eyebrow: 'text-red-400',
        body: 'text-zinc-300',
      }
    : {
        page: 'min-h-screen bg-[#f6f3ec] text-stone-900',
        card: 'border border-stone-200 bg-white/90',
        eyebrow: 'text-stone-500',
        body: 'text-stone-600',
      };
}

export function AuthStatusBanner(props: {
  tone: 'danger' | 'success';
  message?: string;
}) {
  if (!props.message) {
    return null;
  }

  return (
    <div
      className={
        props.tone === 'danger'
          ? 'rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700'
          : 'rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
      }
    >
      {props.message}
    </div>
  );
}

export function AuthFamilyShell(props: {
  family: 'a' | 'b';
  eyebrow: string;
  title: string;
  description: string;
  supportingLine?: string;
  children: ReactNode;
}) {
  const classes = shellClasses(props.family);

  return (
    <main className={classes.page}>
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section className="flex flex-col justify-center">
          <p className={`text-xs uppercase tracking-[0.45em] ${classes.eyebrow}`}>{props.eyebrow}</p>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            {props.title}
          </h1>
          <p className={`mt-4 max-w-xl text-base leading-7 ${classes.body}`}>{props.description}</p>
          {props.supportingLine ? (
            <p className={`mt-6 text-sm ${classes.body}`}>{props.supportingLine}</p>
          ) : null}
        </section>
        <section className={`rounded-[1.75rem] p-6 shadow-sm sm:p-8 ${classes.card}`}>{props.children}</section>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Keep the auth components importing from the repaired shell contract**

The imports in these files should remain:

```tsx
// apps/web/src/components/auth/auth-form.tsx
import { AuthStatusBanner } from './auth-shell';

// apps/web/src/components/auth/admin-setup-flow.tsx
import { AuthStatusBanner } from './auth-shell';
```

Do not leave any `WebDesignStudio` export in `auth-shell.tsx`.

- [ ] **Step 4: Run web typecheck to verify every tenant auth page now compiles**

Run:

```bash
pnpm --filter @sneakereco/web typecheck
```

Expected:

```text
PASS with no "no exported member 'AuthFamilyShell'" or "no exported member 'AuthStatusBanner'" errors.
```

- [ ] **Step 5: Commit the tenant auth-shell recovery**

```bash
git add apps/web/src/components/auth/auth-shell.tsx apps/web/src/components/auth/web-design-studio.tsx apps/web/src/components/auth/auth-form.tsx apps/web/src/components/auth/admin-setup-flow.tsx
git commit -m "fix: restore tenant auth shell contract"
```

## Task 4: Repair BFF Session Routing And Platform Auth Compile Errors

**Files:**
- Modify: `apps/web/src/app/api/auth/me/route.ts`
- Move/Rename: `apps/platform/src/lib/auth/principal-codex.ts` -> `apps/platform/src/lib/auth/principal-codec.ts`
- Modify: `apps/platform/src/lib/auth/bff.ts`
- Modify: `apps/platform/src/components/platform-auth/platform-auth-form.tsx`
- Test: `apps/platform/src/lib/auth/bff.ts`
- Test: `apps/platform/src/components/platform-auth/platform-auth-form.tsx`

- [ ] **Step 1: Fix the tenant session-read route so it reads session state instead of logging the user out**

Replace `apps/web/src/app/api/auth/me/route.ts` with:

```ts
import type { NextRequest } from 'next/server';

import { handleSessionAction } from '@/lib/auth/bff';

export function GET(request: NextRequest) {
  return handleSessionAction(request, 'auth/session-control/me');
}
```

- [ ] **Step 2: Rename the platform principal codec file to match the BFF import contract**

Run:

```bash
git mv apps/platform/src/lib/auth/principal-codex.ts apps/platform/src/lib/auth/principal-codec.ts
```

Expected:

```text
The file name should now match `apps/platform/src/lib/auth/bff.ts`.
```

- [ ] **Step 3: Keep the platform BFF import aligned with the renamed codec module**

In `apps/platform/src/lib/auth/bff.ts`, the import should read:

```ts
import { principalHeaders } from './principal-codec';
```

If the rename updates it automatically, confirm the import still matches exactly.

- [ ] **Step 4: Remove the duplicate `headers` key from the platform auth form request**

Replace the fetch call in `apps/platform/src/components/platform-auth/platform-auth-form.tsx` with:

```tsx
const response = await fetch(props.endpoint, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-csrf-token': csrfToken,
  },
  body: JSON.stringify(values),
});
```

- [ ] **Step 5: Run web and platform typechecks together**

Run:

```bash
pnpm --filter @sneakereco/web typecheck
pnpm --filter @sneakereco/platform typecheck
```

Expected:

```text
`web` should stay green, and `platform` should pass with no duplicate-header or missing principal-codec errors.
```

- [ ] **Step 6: Commit the BFF and platform auth fixes**

```bash
git add apps/web/src/app/api/auth/me/route.ts apps/platform/src/lib/auth/bff.ts apps/platform/src/lib/auth/principal-codec.ts apps/platform/src/components/platform-auth/platform-auth-form.tsx
git commit -m "fix: recover bff and platform auth wiring"
```

## Task 5: Run Full Stage-1 Verification And Lock The Green Baseline

**Files:**
- Test: `apps/api/tests/unit/**/*`
- Test: `apps/api/tests/integration/**/*`

- [ ] **Step 1: Run the Stage 1 verification contract exactly**

Run:

```bash
pnpm --filter @sneakereco/api typecheck
pnpm --filter @sneakereco/web typecheck
pnpm --filter @sneakereco/platform typecheck
pnpm --filter @sneakereco/api test:unit
pnpm --filter @sneakereco/api test:integration
```

Expected:

```text
All five commands PASS.
```

- [ ] **Step 2: Run build smoke checks for the three apps**

Run:

```bash
pnpm --filter @sneakereco/api build
pnpm --filter @sneakereco/web build
pnpm --filter @sneakereco/platform build
```

Expected:

```text
All three builds PASS without introducing new compile or bundling errors.
```

- [ ] **Step 3: Review the final diff before the closing commit**

Run:

```bash
git status --short
git diff --stat
```

Expected:

```text
Only the intended runtime-recovery files should be modified.
```

- [ ] **Step 4: Commit the verified green baseline**

```bash
git add apps/api/tests/jest.unit.config.js apps/api/tests/jest.integration.config.js apps/api/src/app.module.ts apps/api/src/main.ts apps/api/src/core/cognito/cognito.module.ts apps/api/src/core/cognito/cognito-tenant-factory.service.ts apps/api/src/modules/admin-access/admin-access.module.ts apps/api/src/modules/platform-onboarding/review-application.dto.ts apps/api/src/modules/platform-onboarding/review.controller.ts apps/api/src/modules/tenants/tenant-provisioning.gateway.ts apps/web/src/components/auth/auth-shell.tsx apps/web/src/components/auth/web-design-studio.tsx apps/web/src/components/auth/auth-form.tsx apps/web/src/components/auth/admin-setup-flow.tsx apps/web/src/app/api/auth/me/route.ts apps/platform/src/lib/auth/bff.ts apps/platform/src/lib/auth/principal-codec.ts apps/platform/src/components/platform-auth/platform-auth-form.tsx docs/superpowers/plans/2026-04-30-runtime-recovery.md
git commit -m "chore: recover runtime verification baseline"
```

## Spec Coverage Check

- Verification and workspace wiring baseline: covered by Task 1 and Task 5.
- API runtime stabilization: covered by Task 2 and revalidated in Task 5.
- Tenant and platform auth surface recovery: covered by Task 3 and Task 4.
- Tactical structural cleanup where directly blocking stability: covered by the file moves in Task 2, the shell/editor split in Task 3, and the codec rename in Task 4.

## Placeholder Scan

- No `TODO`, `TBD`, or "implement later" markers remain.
- Every code-changing step names exact files and includes concrete code or commands.
- Every verification step names the exact command to run and the expected success condition.

## Type Consistency Check

- `CognitoTenantFactoryService` is named consistently across the renamed file and the two known import sites.
- `AuthFamilyShell` and `AuthStatusBanner` are the only auth-shell exports relied on by the tenant auth pages and auth form components in this stage.
- `principal-codec.ts` is the platform-side filename expected by `apps/platform/src/lib/auth/bff.ts`.
