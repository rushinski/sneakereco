# Module Structure Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vertically slice the `web-builder` module, remove redundant `tenant-*` filename prefixes inside `modules/tenants/`, wire the outbox worker to actually dispatch events, and ensure all cross-module side effects route through events rather than direct service calls.

**Architecture:** `web-builder` follows the same vertical-slice pattern as `auth` and `platform-onboarding` — one sub-folder per use-case with its own controller, service, and repository. `modules/tenants/` filenames drop the redundant `tenant-` prefix since the module directory already establishes context. The outbox worker runs in the worker entrypoint and polls for pending events on a schedule.

**Tech Stack:** NestJS, `@nestjs/schedule` (for the outbox worker polling), Drizzle.

**Prerequisites:** Plans 1 and 4 must be complete.

---

### Task 1: Remove redundant `tenant-*` filename prefix inside `modules/tenants/`

**Files (rename, not delete):**
- `tenant-admin-relationships/admin-tenant-relationships.repository.ts` → keep filename, it doesn't have the prefix — verify and skip if already clean
- `tenant-business-profile/tenant-business-profile.repository.ts` → rename to `business-profile.repository.ts`
- `tenant-cognito/tenant-cognito-config.repository.ts` → rename to `cognito-config.repository.ts`
- `tenant-domain/tenant-domain-config.repository.ts` → rename to `domain-config.repository.ts`
- `tenant-domain/tenant-resolution.service.ts` → rename to `resolution.service.ts`
- `tenant-lifecycle/tenant.repository.ts` → already clean, skip
- `tenant-provisioning/tenant-provisioning.service.ts` → rename to `provisioning.service.ts`
- `tenant-provisioning/tenant-provisioning.gateway.ts` → rename to `provisioning.gateway.ts`
- Update all import statements in files that reference the old names
- Modify: `apps/api/src/modules/tenants/tenants.module.ts` — update provider/import references

- [ ] **Step 1: Find all files that import from the old paths**

```bash
grep -r "tenant-cognito-config.repository\|tenant-domain-config.repository\|tenant-business-profile.repository\|tenant-provisioning.service\|tenant-provisioning.gateway" \
  apps/api/src/ --include="*.ts" -l
```

List every file — those imports must be updated after renaming.

- [ ] **Step 2: Rename files using git mv (preserves history)**

```bash
cd apps/api/src/modules/tenants

git mv tenant-business-profile/tenant-business-profile.repository.ts \
       tenant-business-profile/business-profile.repository.ts

git mv tenant-cognito/tenant-cognito-config.repository.ts \
       tenant-cognito/cognito-config.repository.ts

git mv tenant-domain/tenant-domain-config.repository.ts \
       tenant-domain/domain-config.repository.ts

git mv tenant-provisioning/tenant-provisioning.service.ts \
       tenant-provisioning/provisioning.service.ts

git mv tenant-provisioning/tenant-provisioning.gateway.ts \
       tenant-provisioning/provisioning.gateway.ts
```

- [ ] **Step 3: Update the class names inside the renamed files**

In each renamed file, update the class name to drop the `Tenant` prefix where it's redundant within the module context:
- `TenantBusinessProfileRepository` → `BusinessProfileRepository`
- `TenantCognitoConfigRepository` → `CognitoConfigRepository`
- `TenantDomainConfigRepository` → `DomainConfigRepository`
- `TenantProvisioningService` → `ProvisioningService`
- `TenantProvisioningGateway` → `ProvisioningGateway`

**Note:** Keep the full name in the public export if other modules import it — they need the longer name for disambiguation. A reasonable middle ground: keep `TenantDomainConfigRepository` as the exported class name but store it in `domain-config.repository.ts`. The filename clarity is the main win.

Decide per-file whether to rename the class or only the file. Class rename is optional — file rename is required.

- [ ] **Step 4: Update all import statements**

For each file found in Step 1, update the import path to the new filename. Example:

```typescript
// Before:
import { TenantCognitoConfigRepository } from './tenant-cognito/tenant-cognito-config.repository';
// After:
import { TenantCognitoConfigRepository } from './tenant-cognito/cognito-config.repository';
```

- [ ] **Step 5: Build the API to confirm no broken imports**

```bash
cd apps/api && pnpm build
```

Expected: clean TypeScript build. Fix any import errors before committing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/tenants/
git commit -m "refactor(tenants): remove redundant tenant- prefix from module filenames"
```

---

### Task 2: Vertically slice `web-builder` module

**Current state:** flat directory with all repositories and services at the top level.

**Target state:**

```
modules/web-builder/
  design-registry/
    design-registry.controller.ts     ← read-only registry queries
    design-registry.repository.ts     ← (renamed from design-family-registry.repository.ts)
    design-registry.service.ts        ← (new, thin wrapper)
  theme-config/
    theme-config.controller.ts
    theme-config.repository.ts        ← (renamed from theme-drafts.repository.ts)
    theme-config.service.ts
  auth-page-config/
    auth-page-config.controller.ts
    auth-page-config.repository.ts    ← (renamed from auth-page-drafts.repository.ts)
    auth-page-config.service.ts
  email-config/
    email-config.controller.ts
    email-config.repository.ts        ← (renamed from email-drafts.repository.ts)
    email-config.service.ts
  release-sets/
    release-sets.controller.ts
    release-sets.repository.ts        ← (keep name, already clear)
    release-sets.service.ts
    release-history.repository.ts     ← move here from root
  preview/
    preview.controller.ts
    preview-fixtures.repository.ts    ← move here from root
    preview.service.ts
  shared/
    capability-contract-validator.service.ts   ← move here, used across slices
    release-set-validator.service.ts           ← move here
    web-builder.types.ts                       ← move here
  web-builder.module.ts               ← keep at root, update imports
```

- [ ] **Step 1: Create the new sub-directories**

```bash
mkdir -p apps/api/src/modules/web-builder/{design-registry,theme-config,auth-page-config,email-config,release-sets,preview,shared}
```

- [ ] **Step 2: Move files with git mv**

```bash
cd apps/api/src/modules/web-builder

git mv design-family-registry.repository.ts design-registry/design-registry.repository.ts
git mv theme-drafts.repository.ts theme-config/theme-config.repository.ts
git mv auth-page-drafts.repository.ts auth-page-config/auth-page-config.repository.ts
git mv email-drafts.repository.ts email-config/email-config.repository.ts
git mv release-sets.repository.ts release-sets/release-sets.repository.ts
git mv release-history.repository.ts release-sets/release-history.repository.ts
git mv preview-fixtures.repository.ts preview/preview-fixtures.repository.ts
git mv capability-contract-validator.service.ts shared/capability-contract-validator.service.ts
git mv release-set-validator.service.ts shared/release-set-validator.service.ts
git mv web-builder.types.ts shared/web-builder.types.ts
```

- [ ] **Step 3: Create per-slice service stubs**

For each slice that doesn't have a service yet, create a minimal service that delegates to the repository. Example for `theme-config/theme-config.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ThemeConfigRepository } from './theme-config.repository';

@Injectable()
export class ThemeConfigService {
  constructor(private readonly repo: ThemeConfigRepository) {}

  async getDraft(tenantId: string) {
    return this.repo.findDraftByTenantId(tenantId);
  }

  async saveDraft(tenantId: string, config: unknown) {
    return this.repo.upsertDraft(tenantId, config);
  }
}
```

Create equivalent minimal services for `design-registry`, `auth-page-config`, `email-config`, `release-sets`, and `preview`.

- [ ] **Step 4: Split `web-builder.controller.ts` into per-slice controllers**

Read the current `web-builder.controller.ts`:
```bash
cat apps/api/src/modules/web-builder/web-builder.controller.ts
```

Move each route group to its respective slice controller. Example — routes for design registry go to `design-registry/design-registry.controller.ts`, theme routes to `theme-config/theme-config.controller.ts`, etc.

If the current controller is mostly empty or stubbed, create the controller files as stubs and delete the old file.

- [ ] **Step 5: Update `web-builder.module.ts` with the new structure**

```typescript
import { Module } from '@nestjs/common';
import { DesignRegistryController } from './design-registry/design-registry.controller';
import { DesignRegistryRepository } from './design-registry/design-registry.repository';
import { ThemeConfigController } from './theme-config/theme-config.controller';
import { ThemeConfigRepository } from './theme-config/theme-config.repository';
import { ThemeConfigService } from './theme-config/theme-config.service';
import { AuthPageConfigController } from './auth-page-config/auth-page-config.controller';
import { AuthPageConfigRepository } from './auth-page-config/auth-page-config.repository';
import { AuthPageConfigService } from './auth-page-config/auth-page-config.service';
import { EmailConfigController } from './email-config/email-config.controller';
import { EmailConfigRepository } from './email-config/email-config.repository';
import { EmailConfigService } from './email-config/email-config.service';
import { ReleaseSetsController } from './release-sets/release-sets.controller';
import { ReleaseSetsRepository } from './release-sets/release-sets.repository';
import { ReleaseSetsService } from './release-sets/release-sets.service';
import { ReleaseHistoryRepository } from './release-sets/release-history.repository';
import { PreviewController } from './preview/preview.controller';
import { PreviewFixturesRepository } from './preview/preview-fixtures.repository';
import { PreviewService } from './preview/preview.service';
import { CapabilityContractValidatorService } from './shared/capability-contract-validator.service';
import { ReleaseSetValidatorService } from './shared/release-set-validator.service';

@Module({
  controllers: [
    DesignRegistryController,
    ThemeConfigController,
    AuthPageConfigController,
    EmailConfigController,
    ReleaseSetsController,
    PreviewController,
  ],
  providers: [
    DesignRegistryRepository,
    ThemeConfigRepository,
    ThemeConfigService,
    AuthPageConfigRepository,
    AuthPageConfigService,
    EmailConfigRepository,
    EmailConfigService,
    ReleaseSetsRepository,
    ReleaseSetsService,
    ReleaseHistoryRepository,
    PreviewFixturesRepository,
    PreviewService,
    CapabilityContractValidatorService,
    ReleaseSetValidatorService,
  ],
})
export class WebBuilderModule {}
```

- [ ] **Step 6: Build to confirm clean TypeScript**

```bash
cd apps/api && pnpm build
```

Fix any import path or type errors before committing.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/web-builder/
git commit -m "refactor(web-builder): vertically slice module into per-use-case sub-directories"
```

---

### Task 3: Wire the outbox worker to actually poll and dispatch events

**Files:**
- Modify: `apps/api/src/workers/outbox/outbox.worker.ts`
- Modify: `apps/api/src/worker-app.module.ts`
- Modify: `apps/api/src/worker-main.ts`

- [ ] **Step 1: Read the current outbox worker**

```bash
cat apps/api/src/workers/outbox/outbox.worker.ts
cat apps/api/src/worker-app.module.ts
cat apps/api/src/worker-main.ts
```

Note: is `@nestjs/schedule` installed? Is there a polling mechanism?

- [ ] **Step 2: Install `@nestjs/schedule` if not present**

```bash
cd apps/api && cat package.json | grep "@nestjs/schedule"
```

If not found:
```bash
cd apps/api && pnpm add @nestjs/schedule
```

- [ ] **Step 3: Implement outbox polling in `outbox.worker.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxRepository } from '../../core/events/outbox.repository';
import { AuthEmailService } from '../../modules/communications/auth-email/auth-email.service';
import { PlatformOnboardingEmailService } from '../../modules/communications/onboarding-email/platform-onboarding-email.service';

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly authEmailService: AuthEmailService,
    private readonly onboardingEmailService: PlatformOnboardingEmailService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processOutbox(): Promise<void> {
    const events = await this.outboxRepository.findPendingBatch(20);
    if (events.length === 0) return;

    this.logger.log(`Processing ${events.length} outbox events`);

    for (const event of events) {
      try {
        await this.dispatch(event);
        await this.outboxRepository.markDispatched(event.id);
      } catch (err) {
        this.logger.error(`Failed to dispatch event ${event.id}: ${String(err)}`);
        await this.outboxRepository.markFailed(event.id, String(err));
      }
    }
  }

  private async dispatch(event: { type: string; payload: Record<string, unknown> }): Promise<void> {
    const emailEvents = new Set([
      'customer.registration.initiated',
      'customer.otp.requested',
      'customer.password.reset.requested',
    ]);
    const onboardingEvents = new Set([
      'tenant.application.submitted',
      'tenant.application.approved',
      'tenant.application.denied',
      'tenant.admin.setup.invited',
    ]);

    if (emailEvents.has(event.type)) {
      await this.authEmailService.handleEvent(event as any);
    } else if (onboardingEvents.has(event.type)) {
      await this.onboardingEmailService.handleEvent(event as any);
    } else {
      this.logger.warn(`No handler for event type: ${event.type}`);
    }
  }
}
```

- [ ] **Step 4: Register ScheduleModule and OutboxWorker in `worker-app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppModule } from './app.module';
import { OutboxWorker } from './workers/outbox/outbox.worker';
import { EmailWorker } from './workers/email/email.worker';

@Module({
  imports: [ScheduleModule.forRoot(), AppModule],
  providers: [OutboxWorker, EmailWorker],
})
export class WorkerAppModule {}
```

- [ ] **Step 5: Start the worker and verify it polls**

```bash
cd apps/api && pnpm start:dev:worker  # adjust script name to match package.json
```

Expected log every 5 seconds:
```
[OutboxWorker] Processing 0 outbox events
```

After submitting a tenant application, expected:
```
[OutboxWorker] Processing 1 outbox events
[OutboxWorker] Event tenant.application.submitted dispatched
```

Check Mailpit for the submission confirmation email.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/workers/outbox/outbox.worker.ts
git add apps/api/src/worker-app.module.ts
git commit -m "feat(worker): wire outbox polling worker to dispatch domain events"
```

---

### Task 4: Audit and remove any remaining direct cross-module service calls

**Files:**
- Search: all service files in `modules/auth/` for direct imports from `modules/communications/`
- Search: `modules/platform-onboarding/` for direct imports from `modules/communications/`

- [ ] **Step 1: Find cross-module direct dependencies**

```bash
grep -r "from '.*communications" apps/api/src/modules/auth/ --include="*.ts"
grep -r "from '.*communications" apps/api/src/modules/platform-onboarding/ --include="*.ts"
grep -r "from '.*tenants" apps/api/src/modules/auth/ --include="*.ts"
```

List every cross-module import found. Each one is a coupling violation.

- [ ] **Step 2: Replace each direct import with an outbox event**

For each cross-module call found, remove the direct import and replace with an outbox write. Example:

**Before** (in `review.service.ts`):
```typescript
import { PlatformOnboardingEmailService } from '../../communications/onboarding-email/platform-onboarding-email.service';

// ...
await this.emailService.sendApprovalEmail(application);
```

**After**:
```typescript
import { OutboxRepository } from '../../../core/events/outbox.repository';

// ...
await this.outboxRepository.create({
  eventType: 'tenant.application.approved',
  payload: { applicationId: application.id, tenantId: application.approvedTenantId, ... },
});
```

- [ ] **Step 3: Build and run tests**

```bash
cd apps/api && pnpm build && pnpm test
```

Expected: clean build, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/
git commit -m "refactor(modules): replace direct cross-module service calls with outbox events"
```

---

### Task 5: Final verification — full monorepo build and smoke tests

- [ ] **Step 1: Run full build**

```bash
pnpm build
```

Expected: all 5 packages succeed.

- [ ] **Step 2: Run all API tests**

```bash
cd apps/api && pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Verify no cross-module imports remain**

```bash
grep -r "from '.*modules/communications" apps/api/src/modules/auth/ --include="*.ts"
grep -r "from '.*modules/tenants" apps/api/src/modules/auth/ --include="*.ts"
grep -r "from '.*modules/auth" apps/api/src/modules/tenants/ --include="*.ts"
```

Expected: no output (or only explicitly allowed imports like shared types).

- [ ] **Step 4: Update master index**

Mark Plan 6 as `Complete` in `docs/superpowers/plans/2026-05-01-00-remediation-master-index.md`.

Update all plan statuses to reflect the final state of the project.
