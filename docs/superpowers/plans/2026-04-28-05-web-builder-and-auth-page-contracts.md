# Web Builder And Auth Page Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend model for versioned tenant customization, fixed-slot page composition, auth-shell contracts, release sets, previews, and publish validation.

**Architecture:** Use a registry-driven configuration system with pinned variant versions, draft/published/scheduled/rollback states, and coordinated release sets. Keep arbitrary markup and arbitrary CSS out of the system.

**Tech Stack:** NestJS, PostgreSQL, Drizzle ORM, TypeScript

---

## File Structure

**Create:**
- `apps/api/src/modules/web-builder/*`
- `packages/db/src/schema/tenant-config/*` new versioned resources
- `packages/db/src/schema/catalog/*` registry-adjacent resources if needed

**Tasks**

- [ ] Add schema resources for theme configs, theme versions, page configs, page versions, auth shell configs, auth page configs, email configs, release sets, and release history.
- [ ] Add registry-side resources for design families, slot definitions, component variants, component variant versions, and preview fixtures.
- [ ] Encode the fixed-slot page model and auth-shell model in validation services.
- [ ] Add capability-contract validation for auth flows so enabled features cannot be rendered into broken page states.
- [ ] Add draft/published/scheduled/archived lifecycle support plus rollback targets.
- [ ] Add conflict detection on draft edits without hard locks.
- [ ] Add preview-state fixtures for layout and auth-state previews.
- [ ] Add publish validation for accessibility, slot compatibility, required capabilities, and release-set consistency.
- [ ] Model the initial admin dashboard “Web design” surface contract and preview-mode switching.

## Verification

- [ ] Unit test capability contract validation.
- [ ] Unit test release-set consistency checks.
- [ ] Integration test draft save, scheduled publish, and rollback.
