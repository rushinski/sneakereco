# Runtime Recovery Design

## Purpose

This spec defines Stage 1 of the codebase remediation effort: recover the repository to a trustworthy green baseline without attempting the full architectural redesign yet.

This stage exists to make the current auth/platform rebuild verifiable again. It is intentionally limited to the work required to restore build integrity, test integrity, and compile integrity across the API, tenant web app, and platform app while allowing targeted structural cleanup where the current structure is itself the source of breakage.

## Background

The current codebase has several classes of failure that prevent safe iteration:

- broken module/file naming alignment in the API runtime
- broken Nest bootstrap wiring
- broken workspace resolution in API tests
- broken tenant/platform auth shell contracts
- broken BFF route and codec wiring
- mixed-purpose files that block straightforward verification

These failures make the repository unstable as a development base. The immediate problem is not that the final architecture is imperfect; it is that the system cannot currently prove even its intended intermediate behavior through typechecking and tests.

## Goal

Produce a reproducible green baseline where:

- `apps/api`, `apps/web`, and `apps/platform` all typecheck
- the API unit test suite passes
- the API integration test suite passes
- tenant and platform auth/BFF surfaces compile against correct contracts
- the remaining known structural problems are explicitly deferred to later remediation stages

## Non-Goals

This stage does not attempt to solve the whole architecture.

Out of scope:

- repository-wide vertical slice redesign
- full removal of all `shared` misuse
- full replacement of in-memory adapters with durable infrastructure
- full tenant resolution redesign beyond what blocks compile/test correctness
- full frontend security hardening
- full schema retirement and full RLS completion

These items will be handled in later specs unless a narrow portion of them directly blocks the green baseline.

## Recovery Principles

### Green first, but not blindly

The purpose of this stage is not to force green checks at any cost. Tactical cleanup is allowed when the current structure is itself the reason the checks are red.

### Tactical cleanup is in scope

If a misplaced file, mixed-purpose module, or naming mismatch is actively causing breakage or making verification brittle, it should be corrected now rather than deferred.

### Do not broaden into full redesign

Changes should restore coherence where needed for runtime recovery, but should stop short of the deeper slice-by-slice restructuring planned for later stages.

### Verification is the contract

A change is not complete in this stage unless it strengthens the repository's ability to prove correctness through its own scripts and tests.

## Stage Boundaries

### In Scope

#### 1. Verification and workspace wiring

Repair the tooling path so verification commands are meaningful and reproducible.

This includes:

- Jest workspace alias resolution for local packages such as `@sneakereco/shared`
- TypeScript module/path resolution issues that currently block `typecheck`
- package script alignment where current script behavior is misleading or broken
- any bootstrap-level wiring issue that prevents build or test commands from reflecting actual code health

#### 2. API runtime stabilization

Repair the Nest runtime graph so the API foundation from the auth/platform plans compiles cleanly.

This includes:

- import and filename mismatches such as `admin-acess` vs `admin-access`
- Cognito tenant factory naming drift
- onboarding DTO import mismatches
- invalid `main.ts` bootstrap references that bypass or incorrectly use Nest DI
- worker/runtime composition errors that prevent the API from forming a coherent module graph

#### 3. Tenant and platform auth surface recovery

Repair the browser-facing auth/BFF layer so the tenant and platform apps compile against the intended contracts.

This includes:

- broken route forwarding such as session routes pointing at the wrong API action
- missing auth shell exports
- mismatched codec module naming
- mixed-purpose auth/editor files whose current placement breaks auth page compilation
- platform auth form or BFF construction errors that prevent the platform auth surface from compiling

#### 4. Tactical structural cleanup where directly blocking stability

Limited structural movement is allowed when it is the simplest correct path to recovery.

Examples:

- separating auth-shell code from admin web-design preview code
- renaming files/modules to match their import contract
- reducing the most immediate `shared` misuse where the misuse directly contributes to test or compile failure

### Out of Scope

#### 1. Full vertical slice refactor

Auth, tenants, onboarding, communications, audit, and web-builder are not being fully redesigned in this stage.

#### 2. Full security pass

Frontend and BFF security will only be changed here if the current implementation is preventing compile/test correctness. Broader hardening belongs to the later security/tenant-resolution stage.

#### 3. Full schema and RLS alignment

Legacy table retirement, full policy coverage, and schema normalization are explicitly deferred unless a narrow schema issue directly blocks current verification.

## Target Outcomes

### Outcome A: Reliable toolchain feedback

Running the verification commands should fail only on real code defects, not on broken local package resolution or preventable workspace wiring issues.

### Outcome B: Coherent API foundation

The API app and worker entrypoint should compile as a valid implementation of the current superpowers auth/platform runtime foundation.

### Outcome C: Coherent auth/BFF frontend contracts

Tenant and platform auth pages should compile against correctly named, correctly scoped primitives, and BFF route handlers should target the correct API actions.

### Outcome D: Clean deferral line

Anything not required for the green baseline should be left out on purpose and recorded as a handoff to later stages.

## Workstreams

### Workstream A: Verification and Wiring Baseline

Repair test and typechecking infrastructure first so later fixes are measured correctly.

Representative problem areas:

- API Jest cannot resolve workspace package imports
- script behavior may not reflect real verification state consistently
- module resolution failures blur tooling problems and code problems together

Deliverable:

- verification commands reflect actual repository health

### Workstream B: API Runtime Stabilization

Repair the Nest runtime shell and compile graph.

Representative problem areas:

- misnamed module files and broken import targets
- bootstrap code referencing repository instances that were never retrieved from the Nest container
- incomplete wiring across auth, tenants, onboarding, communications, and audit runtime paths

Deliverable:

- API runtime compiles and supports passing unit/integration verification

### Workstream C: Tenant and Platform Auth Surface Recovery

Repair the tenant and platform Next.js auth surfaces so they compile against the intended BFF and auth-shell contracts.

Representative problem areas:

- wrong BFF route forwarding
- missing auth shell exports
- codec naming divergence between web and platform
- mixed-purpose component placement

Deliverable:

- tenant and platform auth pages and route handlers compile cleanly

### Workstream D: Tactical Structural Cleanup

Perform narrowly scoped cleanup only when it materially reduces breakage or prevents immediate re-regression.

Representative problem areas:

- a file whose name and responsibility no longer match
- a contract module that now hosts unrelated UI logic
- a shared location that forces incorrect cross-boundary imports during recovery

Deliverable:

- the recovered baseline is not dependent on obviously broken structure remaining in place

## Verification Contract

Stage 1 is complete only when all of the following are green:

```bash
pnpm --filter @sneakereco/api typecheck
pnpm --filter @sneakereco/web typecheck
pnpm --filter @sneakereco/platform typecheck
pnpm --filter @sneakereco/api test:unit
pnpm --filter @sneakereco/api test:integration
```

Optional final smoke verification may be added after the above are stable if the workspace-level scripts become reliable enough to provide extra confidence without obscuring failures.

## Exit Criteria

The stage is done when:

1. All required verification commands pass.
2. API runtime module/file naming and wiring mismatches that block compilation are resolved.
3. Tenant and platform auth/BFF compile errors are resolved through correct contract restoration.
4. Tactical structural cleanup has been applied where necessary to prevent immediate recurrence of the same failures.
5. Remaining deeper architecture, security, and schema issues are documented for the next stages instead of being partially addressed here.

## Risks

### Risk: Stage 1 quietly expands into redesign

This would slow recovery and blur the acceptance criteria.

Mitigation:

- restrict structural work to breakage-driven cleanup
- defer broad slice redesign explicitly

### Risk: Superficial fixes produce green checks but preserve broken boundaries

This would create a misleading baseline.

Mitigation:

- allow tactical moves where the current structure is obviously the source of failure
- avoid patching around wrong ownership when a small relocation is the clearer fix

### Risk: Test green status is false confidence

This can happen if tooling is still misconfigured or if critical suites are skipped.

Mitigation:

- treat Jest/workspace resolution as a first-class recovery item
- require the named verification commands, not ad hoc local success

## Handoff To Later Stages

The next specs will pick up the deeper work intentionally left out here:

- full vertical slice and separation-of-concerns redesign
- full tenant/platform security and tenant-resolution hardening
- schema retirement, table alignment, and complete RLS coverage

This stage should make those later specs safer by giving them a stable, verifiable starting point.
