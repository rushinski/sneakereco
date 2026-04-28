# Identity And Cognito Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared identity, ULID, Cognito, and database-schema foundation for admins, customers, sessions, tenant relationships, and tenant identity provisioning.

**Architecture:** Split identity into explicit admin, customer, relationship, and session domains. Represent shared admin Cognito resources in Terraform, keep tenant customer pools programmatic, and align the local schema with the locked claim/session contract.

**Tech Stack:** Terraform, NestJS, Drizzle ORM, PostgreSQL, AWS Cognito, TypeScript, prefixed ULIDs

---

## File Structure

**Create:**
- `infra/modules/cognito-admin-pool/*`
- `infra/environments/dev/cognito-admin-pool.tf`
- `packages/shared/src/utils/id.ts` updates for new prefixes
- `packages/db/src/schema/identity/admin-users.ts`
- `packages/db/src/schema/identity/customer-users.ts`
- `packages/db/src/schema/identity/admin-tenant-relationships.ts`
- `packages/db/src/schema/identity/auth-sessions.ts`
- `packages/db/src/schema/identity/tenant-applications.ts`
- `packages/db/src/schema/identity/tenant-setup-invitations.ts`
- `packages/db/src/schema/identity/tenant-business-profiles.ts`
- `packages/db/src/schema/tenant-config/tenant-release-sets.ts`
- `packages/db/src/schema/tenant-config/tenant-release-history.ts`
- `apps/api/src/core/config/auth.config.ts`
- `apps/api/src/core/config/domain.config.ts`
- `apps/api/src/core/cognito/*`

**Modify:**
- `packages/db/src/schema/index.ts`
- `packages/db/src/schema/identity/index.ts`
- `packages/db/src/schema/tenant-config/index.ts`
- `packages/db/src/schema/orders/orders.ts`
- `packages/db/src/schema/operations/user-addresses.ts`
- `packages/db/src/schema/communications/contact-messages.ts`
- `packages/db/src/schema/catalog/products.ts`
- `packages/db/src/schema/operations/featured-items.ts`
- `packages/db/src/schema/shared/rls.ts`
- `packages/shared/src/index.ts`
- `.env.example`

## Task 1: Update ULID Prefix Contract

- [ ] Replace ambiguous identity/config prefixes in `packages/shared/src/utils/id.ts`.
- [ ] Add prefixes for `adminUser`, `customerUser`, `adminTenantRelationship`, `authSession`, `tenantApplication`, `tenantSetupInvitation`, `tenantBusinessProfile`, `tenantThemeVersion`, `tenantPageConfig`, `tenantPageConfigVersion`, `tenantAuthShellConfig`, `tenantAuthPageConfig`, `tenantEmailConfig`, `tenantEmailConfigVersion`, `tenantReleaseSet`, `tenantReleaseHistory`, `designFamily`, `componentVariant`, `componentVariantVersion`, `emailTemplateVariant`, and `customerAddress`.
- [ ] Export the updated `EntityType` contract from `packages/shared/src/index.ts`.
- [ ] Add unit tests for `generateId` and `getEntityType` covering at least one identity entity, one session entity, and one config entity.

## Task 2: Replace The Old Identity Schema

- [ ] Add `admin-users.ts` with fields for local admin identity, Cognito linkage, role type, and lifecycle status.
- [ ] Add `customer-users.ts` with tenant-scoped identity fields and lean status/profile linkage only.
- [ ] Add `admin-tenant-relationships.ts` with relationship type, status, and one-active-tenant constraint for tenant-scoped admins.
- [ ] Add `auth-sessions.ts` with all locked fields from the spec, including `session_version`, `origin_jti`, `refresh_token_fingerprint`, and actor-specific nullable foreign keys.
- [ ] Keep and adapt `auth-subject-revocations.ts` and `auth-session-lineage-revocations.ts` to reference the new session model conceptually.
- [ ] Add `tenant-applications.ts`, `tenant-setup-invitations.ts`, and `tenant-business-profiles.ts`.
- [ ] Remove exports for legacy `users` and `tenant-members` from `packages/db/src/schema/identity/index.ts` once replacements exist.

## Task 3: Normalize Existing Cross-Schema References

- [ ] Update `orders.userId` to `orders.customerUserId`.
- [ ] Update `orders.labelCreatedBy` to `orders.labelCreatedByAdminUserId`.
- [ ] Update `operations/user-addresses.ts` to reference `customer_users`.
- [ ] Update `communications/contact-messages.ts` to reference `customer_users` optionally.
- [ ] Update `catalog/products.ts` and `operations/featured-items.ts` to reference `admin_users` for authorship.
- [ ] Update indexes and RLS helpers to use the new foreign key names.

## Task 4: Add Identity-Aware Tenant Config Scaffolding

- [ ] Keep `tenant-cognito-config.ts` and `tenant-domain-config.ts` but adapt fields to the new naming and status model.
- [ ] Add release-set and release-history schema scaffolding to `tenant-config`.
- [ ] Mark legacy `tenant-theme-config.ts`, `tenant-email-config.ts`, and `tenant-onboarding.ts` as to-be-replaced in comments or migration notes rather than as future truth.

## Task 5: Add Shared Admin Cognito Terraform

- [ ] Create a reusable Terraform module for the shared admin user pool.
- [ ] Model at least:
  - shared admin user pool
  - platform admin app client
  - tenant admin app client
  - admin groups
  - token TTLs matching the spec
  - required custom attributes or pre-token customization hooks needed for claims
- [ ] Add environment wiring for dev under `infra/environments/dev/`.
- [ ] Document which Cognito resources remain app-provisioned instead of Terraform-managed.

## Task 6: Build `core/cognito` Contract Scaffolding

- [ ] Add `apps/api/src/core/cognito/cognito.module.ts`.
- [ ] Add services for:
  - admin-pool operations
  - tenant-pool provisioning
  - token/session claim mapping
  - configuration validation
- [ ] Add types for trusted claim names, local principal normalization inputs, and pool/client identity.
- [ ] Keep AWS-specific code in `core/cognito`, not inside feature modules.

## Task 7: Lock The Environment Contract

- [ ] Add explicit config modules for:
  - admin user pool IDs and clients
  - base domain and platform URLs
  - token TTLs
  - session secrets
  - queue/cache prefixes
  - Swagger toggles
  - mail transport inputs
- [ ] Rename ambiguous env names such as `COGNITO_POOL_ID` to `COGNITO_ADMIN_USER_POOL_ID`.
- [ ] Keep tenant origin allow logic data-driven from the database rather than env-driven.
- [ ] Update `.env.example` to the new grouped contract.

## Task 8: Define Initial Migrations And Validation

- [ ] Add Drizzle migrations for the new identity tables before deleting old ones.
- [ ] Sequence migrations so downstream schemas can be updated safely.
- [ ] Add schema-level checks and unique constraints that encode:
  - one active tenant relationship for v1 tenant-scoped admins
  - per-tenant customer uniqueness by email or Cognito subject as intended
  - revoked session lineage uniqueness
  - application/invitation lifecycle integrity

## Verification

- [ ] Run typecheck for `packages/shared` and `packages/db`.
- [ ] Run Drizzle migration generation and inspect SQL for identity tables.
- [ ] Run Terraform validate for the new admin-pool module.
- [ ] Confirm `.env.example` matches the locked spec terminology.
