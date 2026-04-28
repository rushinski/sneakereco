# Auth And Session Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the core API-side auth and session engine for admins and customers, including login, logout, refresh, MFA, OTP, registration, confirmation, password reset, and local session enforcement.

**Architecture:** Use Cognito as the credential and challenge engine, but enforce authorization and revocation through local principals, sessions, claims, and policy checks. Keep feature modules thin over shared auth/session primitives.

**Tech Stack:** NestJS, AWS Cognito, PostgreSQL, Valkey, Drizzle ORM, Zod

---

## File Structure

**Create:**
- `apps/api/src/modules/auth/*`
- `apps/api/src/modules/users/*`
- `apps/api/src/modules/admin-access/*`

**Modify:**
- `apps/api/src/app.module.ts`
- `packages/db/src/schema/identity/*`

## Tasks

- [ ] Create shared auth primitives for principal normalization, local session lookup, claim validation, and revocation checks.
- [ ] Implement admin login, refresh, logout, and required MFA challenge routes.
- [ ] Implement customer login, register, confirm-email, refresh, logout, forgot-password, reset-password, optional MFA, and email-code OTP routes.
- [ ] Create `customer_users` only on successful email confirmation.
- [ ] Enforce `session_id` and `session_version` on every authenticated request.
- [ ] Implement logout-all through subject/session-version invalidation.
- [ ] Persist concrete `auth_sessions` on successful authentication and refresh.
- [ ] Add route-specific throttling hooks for login, OTP, MFA, reset, and refresh.
- [ ] Emit audit events for all required success/failure auth actions.
- [ ] Keep all DB access in repositories, not service-level inline queries.

## Verification

- [ ] Unit test claim normalization and session enforcement.
- [ ] Integration test admin login + MFA challenge flow.
- [ ] Integration test customer signup -> confirm email -> local user creation.
- [ ] Integration test logout-all invalidating already-issued access tokens.
