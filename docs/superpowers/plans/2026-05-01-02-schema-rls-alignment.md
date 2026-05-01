# Schema & RLS Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a complete table lifecycle matrix, classify every auth/platform table by ownership domain, audit RLS coverage, and align the actor model in RLS helpers — so that Plan 4 (Repository → Drizzle) can target the correct tables with confidence.

**Architecture:** This plan is primarily a discovery and alignment exercise that produces (a) a written alignment document, (b) concrete schema migrations that retire deprecated tables and add missing columns, and (c) updated RLS helper functions in `packages/db`. No application-layer slice changes happen here — that is Plan 4's job.

**Tech Stack:** Drizzle ORM schema files in `packages/db/src/schema/`, PostgreSQL RLS via `packages/db/src/schema/shared/`, pnpm workspace, `drizzle-kit` for migrations.

**Source spec:** `docs/superpowers/specs/2026-04-30-schema-and-rls-alignment-design.md`

---

### Task 1: Survey all existing schema tables and produce the lifecycle matrix

**Files:**
- Read: all files under `packages/db/src/schema/`
- Create: `docs/superpowers/specs/2026-05-01-schema-lifecycle-matrix.md` (output artifact)

- [ ] **Step 1: List every exported table in the db package**

```bash
grep -r "pgTable\|mysqlTable" packages/db/src/schema/ --include="*.ts" -l
```

Then for each file:
```bash
grep -n "pgTable" packages/db/src/schema/**/*.ts
```

List every table name found.

- [ ] **Step 2: Classify each table using this matrix**

For every table found, assign:

| Column | Values |
|--------|--------|
| `status` | `active` / `transitional` / `deprecated` / `retire` |
| `ownership` | `platform-global` / `tenant-scoped` / `auth-session` / `operational` / `system-only` |
| `rls_decision` | `tenant-rls` / `platform-admin-only` / `system-only` / `public-read` / `no-rls-justified` |
| `notes` | Any migration or dependency notes |

Apply these rules from the architecture spec:

**Retire immediately** (no new code should reference these):
- `users` — replaced by `admin_users` + `customer_users`
- `tenant_members` — replaced by `admin_tenant_relationships` + `customer_users`
- `tenant_onboarding` — replaced by `tenant_applications` + `tenant_setup_invitations`

**Active tables** (approved model):
- `admin_users` — platform-global, no RLS (platform-admin/system access only)
- `customer_users` — tenant-scoped, tenant RLS
- `admin_tenant_relationships` — platform-global, no RLS
- `tenants` — platform-global, no RLS
- `tenant_applications` — platform-global, no RLS
- `tenant_setup_invitations` — platform-global, no RLS
- `tenant_cognito_configs` — platform-global, no RLS
- `tenant_domain_configs` — platform-global, no RLS
- `tenant_business_profiles` — tenant-scoped, tenant-admin RLS
- `auth_sessions` — auth-session, system/worker access only, no tenant RLS
- `auth_subject_revocations` — auth-session, system/worker access only
- `auth_session_lineage_revocations` — auth-session, system/worker access only

**Transitional** (still used but need versioned replacement eventually):
- `tenant_theme_config` — transitional; web-builder versioned resources planned
- `tenant_email_config` — transitional; web-builder versioned email resources planned

All other tables: classify during the survey based on the rules above.

- [ ] **Step 3: Write the lifecycle matrix to `docs/superpowers/specs/2026-05-01-schema-lifecycle-matrix.md`**

Format:

```markdown
# Schema Lifecycle Matrix

Generated: 2026-05-01

| Table | Status | Ownership | RLS Decision | Notes |
|-------|--------|-----------|-------------|-------|
| users | retire | — | — | Replaced by admin_users + customer_users. No new code. |
| tenant_members | retire | — | — | Replaced by admin_tenant_relationships + customer_users. |
| ... | ... | ... | ... | ... |
```

Fill in every table found in Step 1.

- [ ] **Step 4: Commit the matrix document**

```bash
git add docs/superpowers/specs/2026-05-01-schema-lifecycle-matrix.md
git commit -m "docs: add schema lifecycle matrix for auth/platform tables"
```

---

### Task 2: Audit RLS coverage for every active tenant-scoped table

**Files:**
- Read: `packages/db/src/schema/shared/` (RLS policies, role definitions)
- Read: each active tenant-scoped table file identified in Task 1
- Create: `docs/superpowers/specs/2026-05-01-rls-coverage-audit.md`

- [ ] **Step 1: Read the shared RLS helper layer**

```bash
cat packages/db/src/schema/shared/rls-policies.ts   # or whatever the file is named
cat packages/db/src/schema/shared/role-definitions.ts
```

Note: what actor types are assumed? Do they still reference a generic `users` table or old role strings? List every helper function and what actor it assumes.

- [ ] **Step 2: For each active tenant-scoped table, verify policy coverage**

For each table marked `tenant-scoped` in Task 1's matrix, check whether it has an explicit RLS policy defined. Mark as:
- `covered` — has policy
- `missing` — exported and used but no policy
- `no-rls-justified` — intentionally no RLS with documented reason

- [ ] **Step 3: Write the coverage audit document**

```markdown
# RLS Coverage Audit

Generated: 2026-05-01

## Actor Model (Current vs Required)

### Current RLS helpers assume:
- [list what you found in Step 1]

### Required actor model (from auth platform spec):
- platform_admin
- tenant_admin  
- customer
- system
- worker

### Gap: [list any helpers that need updating]

## Per-Table Coverage

| Table | Scoping | Policy Status | Action Required |
|-------|---------|---------------|-----------------|
| customer_users | tenant | missing | Add tenant_id = current_setting('app.tenant_id') policy |
| ... | ... | ... | ... |
```

- [ ] **Step 4: Commit the audit document**

```bash
git add docs/superpowers/specs/2026-05-01-rls-coverage-audit.md
git commit -m "docs: add RLS coverage audit identifying policy gaps"
```

---

### Task 3: Align RLS actor model helpers to approved actor set

**Files:**
- Modify: `packages/db/src/schema/shared/` (RLS helper files)

- [ ] **Step 1: Read current RLS helper implementation**

Open the RLS helper files from Task 2 Step 1. Identify every function that references:
- `current_user`, `session_user`, or a generic users-table concept
- Old role strings like `'admin'`, `'member'`, `'user'`

- [ ] **Step 2: Update or add actor-model helpers**

The RLS helpers must support these settings that the API sets per-connection:
- `app.actor_type` — one of: `platform_admin`, `tenant_admin`, `customer`, `system`, `worker`
- `app.actor_id` — the actor's primary key
- `app.tenant_id` — the tenant ID for tenant-scoped operations (empty for platform actors)

Add or update the helper functions:

```sql
-- In a migration or via drizzle schema definition:

CREATE OR REPLACE FUNCTION app_actor_type() RETURNS text AS $$
  SELECT current_setting('app.actor_type', true)
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_actor_id() RETURNS text AS $$
  SELECT current_setting('app.actor_id', true)
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_tenant_id() RETURNS text AS $$
  SELECT current_setting('app.tenant_id', true)
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_platform_admin() RETURNS boolean AS $$
  SELECT app_actor_type() = 'platform_admin'
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_tenant_admin_for(t_id text) RETURNS boolean AS $$
  SELECT app_actor_type() = 'tenant_admin' AND app_tenant_id() = t_id
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_customer_of(t_id text) RETURNS boolean AS $$
  SELECT app_actor_type() = 'customer' AND app_tenant_id() = t_id
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_system() RETURNS boolean AS $$
  SELECT app_actor_type() IN ('system', 'worker')
$$ LANGUAGE sql STABLE;
```

Represent these in Drizzle's schema format using `sql` tagged template or a migration file — whichever pattern `packages/db` already uses for RLS. Follow existing conventions in the codebase.

- [ ] **Step 3: Generate and review migration**

```bash
cd packages/db && pnpm drizzle-kit generate
```

Review the generated migration file to confirm it only changes RLS helpers and does not touch active table structures.

- [ ] **Step 4: Run migration against local database**

```bash
cd packages/db && pnpm drizzle-kit migrate
```

Expected: migration applies cleanly.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/shared/
git add packages/db/drizzle/  # migration files
git commit -m "feat(db): align RLS actor model helpers to approved actor set"
```

---

### Task 4: Add missing RLS policies for active tenant-scoped tables

**Files:**
- Modify: `packages/db/src/schema/` — whichever files define the tables listed as `missing` in the audit

- [ ] **Step 1: For each `missing` table from the audit, add the appropriate policy**

Using Drizzle's RLS syntax or raw SQL migrations, add policies matching the RLS decision from the lifecycle matrix. Template for a tenant-scoped customer-data table:

```typescript
// In the table's schema file, using Drizzle pgPolicy or sql migration:
// Policy: customer can read their own rows; tenant_admin can read all rows for their tenant; system can do anything

// customer_users example:
// SELECT policy: actor is system OR (actor is tenant_admin AND tenant matches) OR (actor is customer AND id matches)
// INSERT/UPDATE: system only (created on email confirmation by backend)
// DELETE: system only
```

Work through each table from the audit gap list. Apply the policy intent defined in the lifecycle matrix.

- [ ] **Step 2: Generate and run migration**

```bash
cd packages/db && pnpm drizzle-kit generate && pnpm drizzle-kit migrate
```

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/
git add packages/db/drizzle/
git commit -m "feat(db): add missing RLS policies for active tenant-scoped tables"
```

---

### Task 5: Mark deprecated tables and block new code from referencing them

**Files:**
- Modify: `packages/db/src/schema/identity/` or wherever `users`, `tenant_members`, `tenant_onboarding` are defined
- Modify: `packages/db/src/index.ts` or the schema export barrel

- [ ] **Step 1: Remove `users`, `tenant_members`, `tenant_onboarding` from public exports**

In `packages/db/src/index.ts` (or wherever the schema barrel is), remove or comment-out the exports for deprecated tables:

```typescript
// DEPRECATED — do not use. Replaced by admin_users + customer_users.
// export { users } from './schema/identity/users';
// export { tenantMembers } from './schema/identity/tenant-members';
// export { tenantOnboarding } from './schema/platform-onboarding/tenant-onboarding';
```

Add a `@deprecated` JSDoc to the table definitions themselves:

```typescript
/**
 * @deprecated Replaced by admin_users + customer_users.
 * Do not reference in new code. Scheduled for removal after all foreign keys are migrated.
 */
export const users = pgTable('users', { ... });
```

- [ ] **Step 2: Build the db package and verify TypeScript compiles**

```bash
cd packages/db && pnpm build
```

Expected: clean build. If any application code now has a TypeScript error about deprecated tables, note those files — they need to be fixed in Plan 4 (Repository → Drizzle).

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/
git commit -m "chore(db): mark deprecated tables and remove from public exports"
```

---

### Task 6: Final verification

- [ ] **Step 1: Confirm the lifecycle matrix covers every table in the db package**

```bash
grep -r "pgTable" packages/db/src/schema/ --include="*.ts" | wc -l
```

Compare count to rows in `docs/superpowers/specs/2026-05-01-schema-lifecycle-matrix.md`. They should match.

- [ ] **Step 2: Build db and shared packages**

```bash
pnpm build --filter=@sneakereco/db --filter=@sneakereco/shared
```

Expected: clean.

- [ ] **Step 3: Update master index**

Mark Plan 2 status as `Complete` in `docs/superpowers/plans/2026-05-01-00-remediation-master-index.md`.
