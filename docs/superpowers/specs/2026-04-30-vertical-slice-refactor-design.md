# Vertical Slice Refactor Design

## Purpose

This spec defines Stage 2 of the remediation effort: restructure the codebase so ownership, boundaries, and interaction paths are explicit instead of emergent.

The goal is not aesthetic cleanup. The goal is to make the codebase easier to understand, safer to modify, and less likely to regress into the current state where feature logic, repositories, orchestration, and cross-module concerns are mixed together in broad shared areas.

## Problem Statement

The current codebase has several structural problems:

- broad feature-level `shared` folders act as dumping grounds
- repositories are organized by technical convenience instead of use-case ownership
- low-level dependencies cross module boundaries directly
- modules expose too much of their internals to other modules
- feature flows are hard to trace because transport, orchestration, persistence, and policy concerns are interleaved

This is most visible in auth today, but the same pattern appears across tenants, onboarding, communications, audit, and web-builder.

## Goal

Restructure the application so each major feature is organized around use-case slices with clear ownership and explicit boundaries.

After this stage:

- a reader can locate a feature flow by starting from its slice
- repositories are owned by slices or by narrowly scoped feature-internal adapters
- module-to-module interaction happens through explicit interfaces, services, or event boundaries
- shared code exists only when it is truly feature-wide or platform-wide

## Non-Goals

This stage does not attempt to solve everything at once.

Out of scope:

- full schema redesign or migration strategy
- full frontend security hardening
- speculative abstraction layers with no immediate consumer
- runtime behavior changes that are not required by the refactor
- forcing artificial purity where a pragmatic adapter is enough

## Refactor Principles

### Feature first

The primary organizing unit is the feature module, not the technical layer.

### Slice inside the feature

Within a feature module, organize around concrete use cases such as `login`, `logout`, `review`, `setup-session`, `publish`, or `rollback`.

### Narrow shared areas

`shared` is allowed only for code that is genuinely used by multiple slices in the same feature and is still conceptually part of that feature. It must not become a miscellaneous home for repositories and unrelated helpers.

### Repository ownership is intentional

A repository should live with the slice that owns the use case, or behind a narrowly scoped feature adapter with a name that explains why it exists. It should not sit in a broad `shared` folder merely because multiple slices happen to touch the same table.

### Cross-module interaction must be deliberate

Modules may interact, but not by reaching into each other's low-level internals. Interactions should happen through:

- explicit service contracts
- orchestrator services
- boundary adapters
- event-driven workflows where appropriate

## Target Module Shape

### API structure direction

The API should be organized by feature module first, then by slice inside each feature.

Representative structure:

```text
apps/api/src/modules/
  auth/
    login/
    logout/
    refresh/
    register/
    confirm-email/
    otp/
    mfa-challenge/
    admin-login/
    admin-setup/
    password-reset/
    session-control/
    principals/
    gateways/
    audit/
    auth.module.ts

  platform-onboarding/
    application-submission/
    review/
    setup-session/
    invitations/
    platform-onboarding.module.ts

  tenants/
    tenant-lifecycle/
    tenant-provisioning/
    tenant-domain/
    tenant-cognito/
    tenant-business-profile/
    tenant-admin-relationships/
    tenants.module.ts

  communications/
    auth-email/
    onboarding-email/
    email-audit/
    communications.module.ts

  web-builder/
    theme-drafts/
    auth-page-drafts/
    email-drafts/
    release-sets/
    release-history/
    preview-fixtures/
    validation/
    web-builder.module.ts

  audit/
    retrieval/
    dead-letter/
    audit.module.ts
```

### Auth example structure

Representative auth structure:

```text
apps/api/src/modules/auth/
  login/
    login.controller.ts
    login.service.ts
    login.dto.ts
    login.repository.ts
  logout/
    logout.controller.ts
    logout.service.ts
    logout.repository.ts
  refresh/
    refresh.controller.ts
    refresh.service.ts
    refresh.dto.ts
    refresh.repository.ts
  register/
    register.controller.ts
    register.service.ts
    register.dto.ts
    register.repository.ts
  confirm-email/
    confirm-email.controller.ts
    confirm-email.service.ts
    confirm-email.repository.ts
  otp/
    otp.controller.ts
    otp.service.ts
    otp.dto.ts
    otp.repository.ts
  mfa-challenge/
    mfa-challenge.controller.ts
    mfa-challenge.service.ts
    mfa-challenge.dto.ts
    mfa-challenge.repository.ts
  session-control/
    session-control.service.ts
    session.repository.ts
    subject-revocation.repository.ts
    lineage-revocation.repository.ts
  principals/
    principal-normalizer.service.ts
    principal-codec.ts
    principal.guard.ts
    current-principal.decorator.ts
    auth.types.ts
  gateways/
    cognito-auth.gateway.ts
  audit/
    auth-audit.service.ts
    suspicious-auth-telemetry.service.ts
  auth.module.ts
```

This is a direction example, not a demand to preserve those exact file names. The important rule is use-case ownership and boundary clarity.

### Onboarding example structure

Representative onboarding structure:

```text
apps/api/src/modules/platform-onboarding/
  application-submission/
    application-submission.controller.ts
    application-submission.service.ts
    application-submission.dto.ts
    application-submission.repository.ts
  review/
    review.controller.ts
    review.service.ts
    review.dto.ts
    review.repository.ts
  setup-session/
    setup-session.controller.ts
    setup-session.service.ts
    setup-session.dto.ts
    setup-session.repository.ts
  invitations/
    tenant-setup-invitations.repository.ts
  platform-onboarding.module.ts
```

## Shared Code Rules

### Allowed in feature `shared`

Allowed:

- feature-wide types used by multiple slices
- feature-wide decorators and guards
- feature-wide codec or normalization helpers
- feature-wide policy helpers

Not allowed:

- miscellaneous repositories with no single owner
- cross-module adapters that belong in `core` or another explicit boundary
- transport DTOs for unrelated slices
- feature logic with no clear shared semantic role

### Platform-wide common code

A top-level `common` or equivalent should remain very small and framework-oriented.

Good examples:

- base HTTP error utilities
- request metadata primitives
- generic decorators with no feature ownership

Bad examples:

- repositories
- feature services
- auth domain logic
- tenant-specific helpers

## Cross-Module Interaction Model

### Allowed patterns

Preferred interaction patterns:

- controller -> slice service -> slice-owned persistence adapter
- slice service -> explicit service from another module
- slice service -> event emission -> worker/orchestrator
- module facade -> internal slice

### Disallowed patterns

Avoid:

- importing another module's repository directly into a slice
- treating another module's `shared` folder as a public API
- storing orchestration logic inside repository classes
- making controllers coordinate multiple modules directly

## Frontend Support Code Direction

The same slicing discipline should be applied where practical to the Next.js auth and platform support code.

Examples:

- auth route handlers grouped by use case
- auth shell components separated from admin editor components
- cookie/session/BFF helpers grouped under a clear auth boundary
- tenant resolution logic separated from pure auth state helpers

This stage does not require a full frontend architectural rewrite, but it does require removing obviously mixed-purpose placements.

## Workstreams

### Workstream A: Module ownership map

Define which module owns which use cases and which internal directories belong to that module.

### Workstream B: Auth shared-area reduction

Break up `modules/auth/shared` into principled slice ownership and feature-wide primitives.

### Workstream C: Cross-module boundary cleanup

Replace direct low-level imports with explicit services, adapters, or event boundaries.

### Workstream D: Frontend support structure cleanup

Separate mixed-purpose auth/platform support files where the current shape hides responsibility.

## Success Criteria

This stage is successful when:

1. Each major module has an intentional internal structure.
2. Broad dumping-ground folders are reduced or eliminated.
3. Repositories are owned by slices or by explicit boundary adapters.
4. Cross-module interaction is explicit and reviewable.
5. The resulting structure is easier to trace, debug, and extend without reopening the same sprawl.

## Risks

### Risk: Over-refactoring

Moving too much at once can make the code harder to stabilize.

Mitigation:

- refactor by feature ownership, not by broad mechanical file moves
- keep runtime behavior stable while changing structure

### Risk: False slice purity

A forced abstraction can be worse than a pragmatic boundary.

Mitigation:

- prefer explicit and understandable boundaries over theoretical elegance

### Risk: Shared folder regrowth

Without explicit rules, `shared` will become a dumping ground again.

Mitigation:

- define what is allowed in `shared`
- treat feature folders as public only through explicit surfaces

## Handoff To Later Stages

This stage prepares the codebase for later security and schema work by making ownership and interaction paths understandable.

It should leave the system with clearer boundaries so later hardening and schema alignment can happen against a readable structure rather than a tangled one.
