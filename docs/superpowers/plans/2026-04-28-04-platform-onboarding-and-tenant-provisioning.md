# Platform Onboarding And Tenant Provisioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build tenant application intake, platform review, approval/denial, asynchronous provisioning, setup invitations, and tenant-admin setup orchestration.

**Architecture:** Treat onboarding and provisioning as workflow state machines with durable outbox-driven side effects. Approval is not the same as successful provisioning, and setup is not the same as Cognito account creation.

**Tech Stack:** NestJS, BullMQ, PostgreSQL, AWS Cognito, SES/SMTP, Drizzle ORM

---

## File Structure

**Create:**
- `apps/api/src/modules/platform-onboarding/*`
- `apps/api/src/modules/tenants/*`
- `apps/api/src/workers/tenant-provisioning/*`

**Modify:**
- `packages/db/src/schema/identity/tenant-applications.ts`
- `packages/db/src/schema/identity/tenant-setup-invitations.ts`
- `packages/db/src/schema/tenant-config/tenant-cognito-config.ts`
- `packages/db/src/schema/tenant-config/tenant-domain-config.ts`

## Tasks

- [ ] Add application submission API for `sneakereco.com` onboarding.
- [ ] Add platform admin review APIs for approve/deny.
- [ ] Persist application state and outbox events rather than provisioning inline inside the approval request.
- [ ] Build tenant provisioning worker steps in order:
  - create tenant row
  - create tenant business profile
  - reserve slug/subdomain
  - create tenant customer pool and client
  - persist tenant Cognito config
  - create tenant-admin Cognito user
  - create local `admin_user`
  - create local admin-tenant relationship
  - create setup invitation
  - queue approval/setup email
- [ ] Implement `provisioning_failed` behavior and dead-letter recovery metadata.
- [ ] Build setup-session verification and invitation consumption flows.
- [ ] Keep manual replay/recovery CLI-only in v1.

## Verification

- [ ] Integration test application submit -> approve -> provisioning success.
- [ ] Integration test application deny path.
- [ ] Integration test provisioning failure leading to `provisioning_failed`.
- [ ] Integration test invitation consume and setup-session lifecycle.
