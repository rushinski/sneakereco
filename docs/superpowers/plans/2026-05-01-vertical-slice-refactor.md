# Vertical Slice Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the post-recovery codebase so major API and frontend auth-support features are organized around explicit use-case slices instead of broad shared dumping grounds, while preserving the green runtime baseline established in Stage 1.

**Architecture:** Refactor by feature ownership, not by broad mechanical moves. Start with the worst hotspot (`apps/api/src/modules/auth/shared`), then bring `platform-onboarding`, `tenants`, and `communications` into slice-first layouts, then clean up the frontend auth-support boundaries to match the same ownership model. Preserve behavior throughout by moving one feature family at a time and re-running the relevant tests after each slice transition.

**Tech Stack:** pnpm workspace, NestJS, Fastify, Jest, TypeScript, Next.js

**Task 1 Ownership Note:**
- `auth` owns: principals, session-control, user repositories, auth audit, Cognito gateway
- `platform-onboarding` owns: application submission, review, setup session, invitations, applications repository
- `tenants` owns: tenant lifecycle, provisioning, domain, Cognito config, business profile, admin relationships
- `communications` owns: auth email, onboarding email, email audit, email fixture persistence
- `frontend auth support` owns: auth shell/forms/setup UI, BFF/session helpers, boundary codecs, tenant context helpers

---

## File Structure

**Create:**
- `apps/api/src/modules/auth/principals/auth.types.ts`
- `apps/api/src/modules/auth/principals/auth-principal.guard.ts`
- `apps/api/src/modules/auth/principals/auth-principal-normalizer.service.ts`
- `apps/api/src/modules/auth/principals/auth-principal-codec.ts`
- `apps/api/src/modules/auth/principals/current-principal.decorator.ts`
- `apps/api/src/modules/auth/session-control/auth-session.repository.ts`
- `apps/api/src/modules/auth/session-control/auth-subject-revocations.repository.ts`
- `apps/api/src/modules/auth/session-control/session-enforcement.service.ts`
- `apps/api/src/modules/auth/session-control/session-issuer.service.ts`
- `apps/api/src/modules/auth/gateways/cognito-auth.gateway.ts`
- `apps/api/src/modules/auth/audit/auth-audit.service.ts`
- `apps/api/src/modules/auth/audit/suspicious-auth-telemetry.service.ts`
- `apps/api/src/modules/auth/admin-users/admin-users.repository.ts`
- `apps/api/src/modules/auth/customer-users/customer-users.repository.ts`
- `apps/api/src/modules/platform-onboarding/application-submission/`
- `apps/api/src/modules/platform-onboarding/review/`
- `apps/api/src/modules/platform-onboarding/setup-session/`
- `apps/api/src/modules/platform-onboarding/invitations/tenant-setup-invitations.repository.ts`
- `apps/api/src/modules/platform-onboarding/applications/tenant-applications.repository.ts`
- `apps/api/src/modules/tenants/tenant-provisioning/`
- `apps/api/src/modules/tenants/tenant-domain/`
- `apps/api/src/modules/tenants/tenant-cognito/`
- `apps/api/src/modules/tenants/tenant-business-profile/`
- `apps/api/src/modules/tenants/tenant-lifecycle/`
- `apps/api/src/modules/tenants/tenant-admin-relationships/`
- `apps/api/src/modules/communications/auth-email/`
- `apps/api/src/modules/communications/onboarding-email/`
- `apps/api/src/modules/communications/email-audit/`
- `apps/web/src/components/auth/shell/`
- `apps/web/src/components/auth/admin-setup/`
- `apps/web/src/components/auth/forms/`
- `apps/web/src/lib/auth/session/`
- `apps/web/src/lib/auth/boundary/`
- `apps/platform/src/lib/auth/session/`
- `apps/platform/src/lib/auth/boundary/`

**Move/Rename:**
- `apps/api/src/modules/auth/shared/admin-users.repository.ts` -> `apps/api/src/modules/auth/admin-users/admin-users.repository.ts`
- `apps/api/src/modules/auth/shared/customer-users.repository.ts` -> `apps/api/src/modules/auth/customer-users/customer-users.repository.ts`
- `apps/api/src/modules/auth/shared/auth-session.repository.ts` -> `apps/api/src/modules/auth/session-control/auth-session.repository.ts`
- `apps/api/src/modules/auth/shared/auth-subject-revocations.repository.ts` -> `apps/api/src/modules/auth/session-control/auth-subject-revocations.repository.ts`
- `apps/api/src/modules/auth/shared/session-enforcement.service.ts` -> `apps/api/src/modules/auth/session-control/session-enforcement.service.ts`
- `apps/api/src/modules/auth/shared/session-issuer.service.ts` -> `apps/api/src/modules/auth/session-control/session-issuer.service.ts`
- `apps/api/src/modules/auth/shared/auth-principal.guard.ts` -> `apps/api/src/modules/auth/principals/auth-principal.guard.ts`
- `apps/api/src/modules/auth/shared/auth-principal-normalizer.service.ts` -> `apps/api/src/modules/auth/principals/auth-principal-normalizer.service.ts`
- `apps/api/src/modules/auth/shared/auth-principal-codec.ts` -> `apps/api/src/modules/auth/principals/auth-principal-codec.ts`
- `apps/api/src/modules/auth/shared/current-principal.decorator.ts` -> `apps/api/src/modules/auth/principals/current-principal.decorator.ts`
- `apps/api/src/modules/auth/shared/auth.types.ts` -> `apps/api/src/modules/auth/principals/auth.types.ts`
- `apps/api/src/modules/auth/shared/cognito-auth.gateway.ts` -> `apps/api/src/modules/auth/gateways/cognito-auth.gateway.ts`
- `apps/api/src/modules/auth/shared/auth-audit.service.ts` -> `apps/api/src/modules/auth/audit/auth-audit.service.ts`
- `apps/api/src/modules/auth/shared/suspicious-auth-telemetry.service.ts` -> `apps/api/src/modules/auth/audit/suspicious-auth-telemetry.service.ts`
- `apps/api/src/modules/platform-onboarding/application-submission.controller.ts` -> `apps/api/src/modules/platform-onboarding/application-submission/application-submission.controller.ts`
- `apps/api/src/modules/platform-onboarding/application-submission.dto.ts` -> `apps/api/src/modules/platform-onboarding/application-submission/application-submission.dto.ts`
- `apps/api/src/modules/platform-onboarding/application-submission.service.ts` -> `apps/api/src/modules/platform-onboarding/application-submission/application-submission.service.ts`
- `apps/api/src/modules/platform-onboarding/review.controller.ts` -> `apps/api/src/modules/platform-onboarding/review/review.controller.ts`
- `apps/api/src/modules/platform-onboarding/review.service.ts` -> `apps/api/src/modules/platform-onboarding/review/review.service.ts`
- `apps/api/src/modules/platform-onboarding/review-application.dto.ts` -> `apps/api/src/modules/platform-onboarding/review/review-application.dto.ts`
- `apps/api/src/modules/platform-onboarding/setup-session.controller.ts` -> `apps/api/src/modules/platform-onboarding/setup-session/setup-session.controller.ts`
- `apps/api/src/modules/platform-onboarding/setup-session.dto.ts` -> `apps/api/src/modules/platform-onboarding/setup-session/setup-session.dto.ts`
- `apps/api/src/modules/platform-onboarding/setup-session.service.ts` -> `apps/api/src/modules/platform-onboarding/setup-session/setup-session.service.ts`
- `apps/api/src/modules/communications/auth-email.controller.ts` -> `apps/api/src/modules/communications/auth-email/auth-email.controller.ts`
- `apps/api/src/modules/communications/auth-email.service.ts` -> `apps/api/src/modules/communications/auth-email/auth-email.service.ts`
- `apps/api/src/modules/communications/auth-email-fixtures.repository.ts` -> `apps/api/src/modules/communications/auth-email/auth-email-fixtures.repository.ts`
- `apps/api/src/modules/communications/platform-onboarding-email.service.ts` -> `apps/api/src/modules/communications/onboarding-email/platform-onboarding-email.service.ts`
- `apps/api/src/modules/communications/email-audit.service.ts` -> `apps/api/src/modules/communications/email-audit/email-audit.service.ts`

**Modify:**
- `apps/api/src/modules/auth/auth.module.ts`
- `apps/api/src/modules/platform-onboarding/platform-onboarding.module.ts`
- `apps/api/src/modules/tenants/tenants.module.ts`
- `apps/api/src/modules/communications/communications.module.ts`
- `apps/api/src/modules/audit/audit.controller.ts`
- `apps/api/src/core/security/auth-rate-limit.guard.ts`
- `apps/web/src/components/auth/auth-form.tsx`
- `apps/web/src/components/auth/auth-shell.tsx`
- `apps/web/src/components/auth/admin-setup-flow.tsx`
- `apps/web/src/components/auth/web-design-studio.tsx`
- `apps/web/src/lib/auth/bff.ts`
- `apps/web/src/lib/auth/client-session.ts`
- `apps/web/src/lib/auth/cookies.ts`
- `apps/web/src/lib/auth/csrf.ts`
- `apps/web/src/lib/auth/principal-codec.ts`
- `apps/web/src/lib/auth/tenant.ts`
- `apps/web/src/lib/auth/types.ts`
- `apps/platform/src/lib/auth/bff.ts`
- `apps/platform/src/lib/auth/client-session.ts`
- `apps/platform/src/lib/auth/cookies.ts`
- `apps/platform/src/lib/auth/csrf.ts`
- `apps/platform/src/lib/auth/principal-codec.ts`
- `apps/platform/src/lib/auth/types.ts`

---

## Task 1: Freeze The Stage 1 Baseline And Map Module Ownership

**Files:**
- Modify: `docs/superpowers/plans/2026-05-01-vertical-slice-refactor.md`
- Test: full Stage 1 verification matrix in `.worktrees/vertical-slice-refactor`

- [x] **Step 1: Re-run the Stage 1 verification matrix before any refactor move**

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
All commands exit 0 before any file moves begin.
```

Recorded 2026-05-01 in `.worktrees/vertical-slice-refactor`:

```text
Verified branch head before refactor moves: e246885
pnpm --filter @sneakereco/api typecheck                PASS
pnpm --filter @sneakereco/web typecheck                PASS
pnpm --filter @sneakereco/platform typecheck           PASS
pnpm --filter @sneakereco/api test:unit                PASS (11 suites, 23 tests)
pnpm --filter @sneakereco/api test:integration         PASS (5 suites, 17 tests)
Build-smoke status inherited from the merged jacob-dev baseline verified before this worktree was created.
```

- [x] **Step 2: Add a short ownership note at the top of this plan before implementation starts**

Canonical ownership map is recorded at the top of this plan:

```text
See the `Task 1 Ownership Note` block near the top of this document.
```

- [x] **Step 3: Commit the baseline checkpoint**

```bash
git commit --allow-empty -m "chore: checkpoint vertical slice baseline"
```

Recorded commit:

```text
ccfa1e4 chore: checkpoint vertical slice baseline
```

## Task 2: Break `modules/auth/shared` Into Named Slice Areas

**Files:**
- Move: `apps/api/src/modules/auth/shared/*` into the new `principals`, `session-control`, `gateways`, `audit`, `admin-users`, and `customer-users` directories listed above
- Modify: `apps/api/src/modules/auth/auth.module.ts`
- Modify: `apps/api/src/modules/audit/audit.controller.ts`
- Modify: `apps/api/src/core/security/auth-rate-limit.guard.ts`
- Test: `apps/api/tests/unit/modules/auth/shared/auth-principal-normalizer.service.spec.ts`
- Test: `apps/api/tests/unit/modules/auth/shared/session-enforcement.service.spec.ts`
- Test: `apps/api/tests/integration/modules/auth/auth.flow.spec.ts`

- [x] **Step 1: Move principal, session, gateway, and audit files into explicit subdirectories**

Target structure:

```text
apps/api/src/modules/auth/
  principals/
  session-control/
  gateways/
  audit/
  admin-users/
  customer-users/
  admin-login/
  admin-setup/
  confirm-email/
  customer-login/
  logout/
  mfa-challenge/
  otp/
  password-reset/
  refresh/
  register/
  auth.module.ts
```

- [x] **Step 2: Update all imports that currently reach into `auth/shared`**

Expected import direction after the move:

```ts
import { CurrentPrincipal } from '../auth/principals/current-principal.decorator';
import { AuthPrincipalGuard } from '../auth/principals/auth-principal.guard';
import { AuthAuditService } from '../auth/audit/auth-audit.service';
import { AdminUsersRepository } from '../auth/admin-users/admin-users.repository';
import { AuthSessionRepository } from '../auth/session-control/auth-session.repository';
```

- [x] **Step 3: Narrow `AuthModule` exports to explicit slice surfaces**

Expected shape:

```ts
exports: [
  AdminUsersRepository,
  CustomerUsersRepository,
  AuthSessionRepository,
  AuthSubjectRevocationsRepository,
  AuthPrincipalNormalizerService,
  SessionEnforcementService,
  SessionIssuerService,
  CognitoAuthGateway,
  AuthAuditService,
  AuthPrincipalGuard,
  SuspiciousAuthTelemetryService,
]
```

- [x] **Step 4: Run focused auth tests**

Run:

```bash
pnpm --filter @sneakereco/api test:unit -- tests/unit/modules/auth/shared/auth-principal-normalizer.service.spec.ts
pnpm --filter @sneakereco/api test:unit -- tests/unit/modules/auth/shared/session-enforcement.service.spec.ts
pnpm --filter @sneakereco/api test:integration -- tests/integration/modules/auth/auth.flow.spec.ts
pnpm --filter @sneakereco/api typecheck
```

Expected:

```text
All focused auth tests and API typecheck pass after the shared-folder breakup.
```

- [x] **Step 5: Commit the auth slice refactor**

```bash
git add apps/api/src/modules/auth apps/api/src/modules/audit/audit.controller.ts apps/api/src/core/security/auth-rate-limit.guard.ts
git commit -m "refactor: slice auth shared responsibilities"
```

## Task 3: Slice `platform-onboarding` Around Use Cases

**Files:**
- Move: onboarding controller/service/dto files into `application-submission`, `review`, and `setup-session`
- Move: `tenant-applications.repository.ts` into `applications/`
- Move: `tenant-setup-invitations.repository.ts` into `invitations/`
- Modify: `apps/api/src/modules/platform-onboarding/platform-onboarding.module.ts`
- Test: `apps/api/tests/integration/modules/platform-onboarding/platform-onboarding.flows.spec.ts`

- [x] **Step 1: Create slice directories and move the onboarding use-case files into them**

Target structure:

```text
apps/api/src/modules/platform-onboarding/
  application-submission/
  review/
  setup-session/
  applications/
  invitations/
  platform-onboarding.module.ts
```

- [x] **Step 2: Update internal onboarding imports so repositories are explicit**

Expected direction:

```ts
import { TenantApplicationsRepository } from '../applications/tenant-applications.repository';
import { TenantSetupInvitationsRepository } from '../invitations/tenant-setup-invitations.repository';
```

- [x] **Step 3: Keep cross-module interaction at service boundaries only**

Do not introduce imports from onboarding slices directly into tenant repository classes or auth repository classes. Keep orchestration inside the onboarding services and tenant provisioning gateway/service.

- [x] **Step 4: Run onboarding verification**

Run:

```bash
pnpm --filter @sneakereco/api test:integration -- tests/integration/modules/platform-onboarding/platform-onboarding.flows.spec.ts
pnpm --filter @sneakereco/api typecheck
```

- [x] **Step 5: Commit the onboarding slice refactor**

```bash
git add apps/api/src/modules/platform-onboarding
git commit -m "refactor: slice platform onboarding module"
```

Recorded commit:

```text
ad8788d refactor: slice platform onboarding module
```

## Task 4: Slice `tenants` And Remove Flat Repository Sprawl

**Files:**
- Move tenant files into `tenant-lifecycle`, `tenant-provisioning`, `tenant-domain`, `tenant-cognito`, `tenant-business-profile`, `tenant-admin-relationships`
- Modify: `apps/api/src/modules/tenants/tenants.module.ts`
- Modify: any imports from `platform-onboarding`, `auth`, and `communications` that point to the old flat tenant paths
- Test: `apps/api/tests/integration/modules/platform-onboarding/platform-onboarding.flows.spec.ts`
- Test: `apps/api/tests/integration/operations/hardening-and-ops.spec.ts`

- [x] **Step 1: Move tenant persistence and provisioning files into named slices**

Target structure:

```text
apps/api/src/modules/tenants/
  tenant-lifecycle/
  tenant-provisioning/
  tenant-domain/
  tenant-cognito/
  tenant-business-profile/
  tenant-admin-relationships/
  tenants.module.ts
```

- [x] **Step 2: Keep `TenantProvisioningGateway` and `TenantProvisioningService` together in `tenant-provisioning/`**

Expected pairing:

```text
tenant-provisioning/
  tenant-provisioning.gateway.ts
  tenant-provisioning.service.ts
```

- [x] **Step 3: Update `TenantsModule` provider wiring to the new slice paths**

The provider list should remain behaviorally equivalent, but imports should clearly show which slice owns each class.

- [x] **Step 4: Run the tenant-dependent integration coverage**

Run:

```bash
pnpm --filter @sneakereco/api test:integration -- tests/integration/modules/platform-onboarding/platform-onboarding.flows.spec.ts
pnpm --filter @sneakereco/api test:integration -- tests/integration/operations/hardening-and-ops.spec.ts
pnpm --filter @sneakereco/api typecheck
```

- [x] **Step 5: Commit the tenant slice refactor**

```bash
git add apps/api/src/modules/tenants
git commit -m "refactor: slice tenants module"
```

Recorded commit:

```text
1a10106 refactor: slice tenants module
```

## Task 5: Slice `communications` By Email Use Case

**Files:**
- Move: `auth-email.controller.ts`, `auth-email.service.ts`, `auth-email-fixtures.repository.ts` into `auth-email/`
- Move: `platform-onboarding-email.service.ts` into `onboarding-email/`
- Move: `email-audit.service.ts` into `email-audit/`
- Modify: `apps/api/src/modules/communications/communications.module.ts`
- Test: `apps/api/tests/integration/modules/communications/auth-email.flows.spec.ts`

- [ ] **Step 1: Create the communications slice directories and move the files**

Target structure:

```text
apps/api/src/modules/communications/
  auth-email/
  onboarding-email/
  email-audit/
  communications.module.ts
```

- [ ] **Step 2: Update module wiring and imports**

Expected import direction:

```ts
import { AuthEmailController } from './auth-email/auth-email.controller';
import { AuthEmailService } from './auth-email/auth-email.service';
import { AuthEmailFixturesRepository } from './auth-email/auth-email-fixtures.repository';
import { PlatformOnboardingEmailService } from './onboarding-email/platform-onboarding-email.service';
import { EmailAuditService } from './email-audit/email-audit.service';
```

- [ ] **Step 3: Run communications verification**

Run:

```bash
pnpm --filter @sneakereco/api test:integration -- tests/integration/modules/communications/auth-email.flows.spec.ts
pnpm --filter @sneakereco/api typecheck
```

- [ ] **Step 4: Commit the communications slice refactor**

```bash
git add apps/api/src/modules/communications
git commit -m "refactor: slice communications module"
```

## Task 6: Clean Up Frontend Auth-Support Boundaries

**Files:**
- Move or split: `apps/web/src/components/auth/auth-shell.tsx`, `auth-form.tsx`, `admin-setup-flow.tsx`, `web-design-studio.tsx`
- Move or group: `apps/web/src/lib/auth/*`
- Move or group: `apps/platform/src/lib/auth/*`
- Test: `pnpm --filter @sneakereco/web typecheck`
- Test: `pnpm --filter @sneakereco/platform typecheck`
- Test: `pnpm --filter @sneakereco/web build`
- Test: `pnpm --filter @sneakereco/platform build`

- [ ] **Step 1: Split web auth components into explicit `shell`, `forms`, and `admin-setup` groupings**

Target direction:

```text
apps/web/src/components/auth/
  shell/
  forms/
  admin-setup/
  web-design-studio.tsx
```

- [ ] **Step 2: Group auth lib files by responsibility in both Next.js apps**

Target direction:

```text
apps/web/src/lib/auth/
  boundary/
  session/
  tenant.ts
  types.ts

apps/platform/src/lib/auth/
  boundary/
  session/
  types.ts
```

- [ ] **Step 3: Preserve route handler imports while clarifying ownership**

`bff.ts`, `cookies.ts`, `csrf.ts`, `client-session.ts`, and `principal-codec.ts` should remain under the auth boundary, but the directory structure should distinguish browser/session concerns from HTTP boundary helpers.

- [ ] **Step 4: Run frontend verification**

Run:

```bash
pnpm --filter @sneakereco/web typecheck
pnpm --filter @sneakereco/platform typecheck
$env:SESSION_SIGNING_SECRET='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'; pnpm --filter @sneakereco/web build
$env:SESSION_SIGNING_SECRET='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'; pnpm --filter @sneakereco/platform build
```

- [ ] **Step 5: Commit the frontend boundary cleanup**

```bash
git add apps/web/src/components/auth apps/web/src/lib/auth apps/platform/src/lib/auth
git commit -m "refactor: clarify frontend auth boundaries"
```

## Task 7: Full Regression Verification And Cleanup

**Files:**
- Modify: any broken imports discovered during full verification
- Test: entire Stage 1 verification matrix on the refactored branch

- [ ] **Step 1: Run the full post-refactor verification matrix**

Run:

```bash
pnpm --filter @sneakereco/api typecheck
pnpm --filter @sneakereco/web typecheck
pnpm --filter @sneakereco/platform typecheck
pnpm --filter @sneakereco/api test:unit
pnpm --filter @sneakereco/api test:integration
$env:SESSION_SIGNING_SECRET='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'; pnpm --filter @sneakereco/api build
$env:SESSION_SIGNING_SECRET='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'; pnpm --filter @sneakereco/web build
$env:SESSION_SIGNING_SECRET='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'; pnpm --filter @sneakereco/platform build
```

- [ ] **Step 2: Fix only structural regressions surfaced by verification**

Allowed fixes:

```text
- broken import paths after moves
- missing provider/controller wiring after file relocation
- stale test paths that must follow the new structure
```

Not allowed:

```text
- new feature work
- schema changes
- security redesign beyond structural cleanup
```

- [ ] **Step 3: Commit the final verification cleanup**

```bash
git add apps/api apps/web apps/platform
git commit -m "refactor: finalize vertical slice boundaries"
```

## Self-Review

- Spec coverage: this plan covers the four workstreams in the spec directly:
  - Workstream A: Task 1 ownership map
  - Workstream B: Task 2 auth shared-area reduction
  - Workstream C: Tasks 3, 4, and 5 explicit module boundary cleanup
  - Workstream D: Task 6 frontend support structure cleanup
- Placeholder scan: no `TODO`, `TBD`, or “handle appropriately” placeholders remain.
- Type consistency: task names, folder names, and ownership surfaces are consistent with the approved Stage 2 design spec and the current Stage 1-recovered codebase.
