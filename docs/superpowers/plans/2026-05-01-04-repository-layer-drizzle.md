# Repository Layer → Drizzle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every in-memory `Map` repository with real Drizzle queries against the PostgreSQL database. After this plan, all reads and writes are durable.

**Architecture:** Every repository injects `DatabaseService` from `core/database` (which already wraps a Drizzle client). Repositories import table definitions from `packages/db`. The outbox repository writes event records to `outbox_events` so the worker can dispatch them. No service-layer logic changes in this plan — only the repository implementations.

**Tech Stack:** NestJS, Drizzle ORM, `packages/db` schema, PostgreSQL.

**Prerequisites:** Plan 1 (Foundation Hardening) and Plan 2 (Schema & RLS Alignment) must be complete. Plan 2 establishes which tables are active and which are deprecated — repositories target only active tables.

---

### Task 1: Understand the DatabaseService and Drizzle client shape

**Files:**
- Read: `apps/api/src/core/database/database.service.ts`
- Read: `apps/api/src/core/database/database.module.ts`
- Read: `packages/db/src/index.ts` (schema exports)

- [ ] **Step 1: Read `DatabaseService` to learn the Drizzle client API**

```bash
cat apps/api/src/core/database/database.service.ts
```

Confirm: how do you get the Drizzle client? Is it `this.db` or `this.databaseService.db`? Is it the system URL (RLS-bypassing) or the tenant URL? Note the exact property names — every repository task below uses them.

- [ ] **Step 2: Read the db package exports**

```bash
cat packages/db/src/index.ts
```

Note the exact exported names for each table you will use (e.g., `adminUsers`, `customerUsers`, `authSessions`, etc.).

- [ ] **Step 3: Document the pattern in a comment block**

Before writing any repository, establish the standard pattern used in every task below:

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service'; // adjust path
import { adminUsers } from '@sneakereco/db'; // table from db package
import { eq } from 'drizzle-orm';

@Injectable()
export class ExampleRepository {
  constructor(private readonly db: DatabaseService) {}

  async findById(id: string) {
    const rows = await this.db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, id),
    });
    return rows ?? null;
  }
}
```

Use this pattern for all repositories below. Adjust the Drizzle query style to match whatever the `DatabaseService` exposes (`.query`, `.select`, `.insert`, etc.).

---

### Task 2: Wire `AdminUsersRepository` to Drizzle

**Files:**
- Modify: `apps/api/src/modules/auth/admin-users/admin-users.repository.ts`
- Create: `apps/api/src/modules/auth/admin-users/admin-users.repository.spec.ts`

- [ ] **Step 1: Write a failing integration test (with mocked db)**

Create `apps/api/src/modules/auth/admin-users/admin-users.repository.spec.ts`:

```typescript
import { AdminUsersRepository } from './admin-users.repository';

const mockDb = {
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  query: {
    adminUsers: {
      findFirst: jest.fn(),
    },
  },
};

describe('AdminUsersRepository', () => {
  let repo: AdminUsersRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new AdminUsersRepository({ db: mockDb } as any);
  });

  it('create inserts a row and returns it', async () => {
    const record = {
      id: 'adm_01',
      email: 'admin@example.com',
      cognitoSub: 'cognito-sub-1',
      adminType: 'platform_admin' as const,
      status: 'active' as const,
    };
    mockDb.returning.mockResolvedValue([record]);
    const result = await repo.create({
      email: record.email,
      cognitoSub: record.cognitoSub,
      adminType: record.adminType,
      status: record.status,
    });
    expect(result.email).toBe('admin@example.com');
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('findByCognitoSub queries by cognito_sub', async () => {
    mockDb.query.adminUsers.findFirst.mockResolvedValue({ id: 'adm_01', cognitoSub: 'sub-1' });
    const result = await repo.findByCognitoSub('sub-1');
    expect(result?.cognitoSub).toBe('sub-1');
  });

  it('returns null when not found', async () => {
    mockDb.query.adminUsers.findFirst.mockResolvedValue(undefined);
    const result = await repo.findById('nonexistent');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd apps/api && pnpm test -- --testPathPattern="admin-users.repository"
```

- [ ] **Step 3: Rewrite `AdminUsersRepository` using Drizzle**

```typescript
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { adminUsers } from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';
import { DatabaseService } from '../../../core/database/database.service';

export interface AdminUserRecord {
  id: string;
  email: string;
  fullName?: string;
  cognitoSub: string;
  adminType: 'platform_admin' | 'tenant_scoped_admin';
  status: 'pending_setup' | 'active' | 'suspended' | 'disabled';
  lastLoginAt?: string;
}

@Injectable()
export class AdminUsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(record: Omit<AdminUserRecord, 'id'>): Promise<AdminUserRecord> {
    const id = generateId('adm');
    const [row] = await this.database.db
      .insert(adminUsers)
      .values({ id, ...record })
      .returning();
    return this.toRecord(row);
  }

  async findById(id: string): Promise<AdminUserRecord | null> {
    const row = await this.database.db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, id),
    });
    return row ? this.toRecord(row) : null;
  }

  async findByEmail(email: string): Promise<AdminUserRecord | null> {
    const row = await this.database.db.query.adminUsers.findFirst({
      where: eq(adminUsers.email, email),
    });
    return row ? this.toRecord(row) : null;
  }

  async findByCognitoSub(cognitoSub: string): Promise<AdminUserRecord | null> {
    const row = await this.database.db.query.adminUsers.findFirst({
      where: eq(adminUsers.cognitoSub, cognitoSub),
    });
    return row ? this.toRecord(row) : null;
  }

  async markActive(id: string): Promise<void> {
    await this.database.db
      .update(adminUsers)
      .set({ status: 'active', lastLoginAt: new Date().toISOString() })
      .where(eq(adminUsers.id, id));
  }

  private toRecord(row: typeof adminUsers.$inferSelect): AdminUserRecord {
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName ?? undefined,
      cognitoSub: row.cognitoSub,
      adminType: row.adminType as AdminUserRecord['adminType'],
      status: row.status as AdminUserRecord['status'],
      lastLoginAt: row.lastLoginAt ?? undefined,
    };
  }
}
```

**Note:** Adjust column names (`cognitoSub`, `lastLoginAt`, `adminType`) to match the exact `packages/db` schema column names. If the db schema uses snake_case columns, Drizzle maps them — check the schema definition.

- [ ] **Step 4: Run tests — confirm PASS**

```bash
cd apps/api && pnpm test -- --testPathPattern="admin-users.repository"
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/admin-users/
git commit -m "feat(api): wire AdminUsersRepository to Drizzle"
```

---

### Task 3: Wire `CustomerUsersRepository` to Drizzle

**Files:**
- Modify: `apps/api/src/modules/auth/customer-users/customer-users.repository.ts`
- Create: `apps/api/src/modules/auth/customer-users/customer-users.repository.spec.ts`

- [ ] **Step 1: Write the failing test**

Follow the same mock-db pattern from Task 2. The key queries:
- `create(record)` — inserts with `generateId('cus')`, returns row
- `findByCognitoSubAndTenant(cognitoSub, tenantId)` — finds by both columns
- `findById(id)` — finds by id
- `findByEmailAndTenant(email, tenantId)` — finds by email within a tenant

- [ ] **Step 2: Run to confirm FAIL**

- [ ] **Step 3: Rewrite using Drizzle**

```typescript
import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { customerUsers } from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';
import { DatabaseService } from '../../../core/database/database.service';

@Injectable()
export class CustomerUsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(record: {
    tenantId: string;
    email: string;
    fullName?: string;
    cognitoSub: string;
    status: 'active' | 'suspended' | 'disabled';
  }) {
    const id = generateId('cus');
    const [row] = await this.database.db
      .insert(customerUsers)
      .values({ id, ...record })
      .returning();
    return row;
  }

  async findById(id: string) {
    return (
      (await this.database.db.query.customerUsers.findFirst({
        where: eq(customerUsers.id, id),
      })) ?? null
    );
  }

  async findByCognitoSubAndTenant(cognitoSub: string, tenantId: string) {
    return (
      (await this.database.db.query.customerUsers.findFirst({
        where: and(
          eq(customerUsers.cognitoSub, cognitoSub),
          eq(customerUsers.tenantId, tenantId),
        ),
      })) ?? null
    );
  }

  async findByEmailAndTenant(email: string, tenantId: string) {
    return (
      (await this.database.db.query.customerUsers.findFirst({
        where: and(eq(customerUsers.email, email), eq(customerUsers.tenantId, tenantId)),
      })) ?? null
    );
  }

  async markActive(id: string) {
    await this.database.db
      .update(customerUsers)
      .set({ status: 'active', lastLoginAt: new Date().toISOString() })
      .where(eq(customerUsers.id, id));
  }
}
```

- [ ] **Step 4: Run tests and commit**

```bash
cd apps/api && pnpm test -- --testPathPattern="customer-users.repository"
git add apps/api/src/modules/auth/customer-users/
git commit -m "feat(api): wire CustomerUsersRepository to Drizzle"
```

---

### Task 4: Wire `AuthSessionRepository` to Drizzle

**Files:**
- Modify: `apps/api/src/modules/auth/session-control/auth-session.repository.ts`

The session repository is the most complex — it needs queries for:
- `create(session)` — insert full session record
- `findById(id)` — for enforcement
- `findByRefreshFingerprint(fingerprint)` — for refresh flow
- `revokeById(id, reason)` — mark revoked
- `revokeAllByUserId(userId, actorType, reason)` — logout-all
- `updateLastSeen(id)` — heartbeat on valid request

- [ ] **Step 1: Write the failing test (key cases)**

Create `apps/api/src/modules/auth/session-control/auth-session.repository.spec.ts` with tests for `create`, `findById`, `revokeById`. Use the mock-db pattern from Task 2.

- [ ] **Step 2: Run to confirm FAIL**

- [ ] **Step 3: Rewrite using Drizzle**

Follow the same pattern: inject `DatabaseService`, import `authSessions` table from `@sneakereco/db`, use `eq`, `and`, `or` from `drizzle-orm`. Key difference: `revokeAllByUserId` uses `or(eq(authSessions.adminUserId, userId), eq(authSessions.customerUserId, userId))` depending on actor type.

- [ ] **Step 4: Run tests and commit**

```bash
git add apps/api/src/modules/auth/session-control/auth-session.repository.ts
git add apps/api/src/modules/auth/session-control/auth-session.repository.spec.ts
git commit -m "feat(api): wire AuthSessionRepository to Drizzle"
```

---

### Task 5: Wire `AuthSubjectRevocationsRepository` to Drizzle

**Files:**
- Modify: `apps/api/src/modules/auth/session-control/auth-subject-revocations.repository.ts`

Key queries: `create(revocation)`, `findActiveRevocation(cognitoSub, userPoolId, issuedBefore)`.

- [ ] Follow the same steps: failing test → implement → pass → commit.

```bash
git commit -m "feat(api): wire AuthSubjectRevocationsRepository to Drizzle"
```

---

### Task 6: Wire all platform-onboarding repositories to Drizzle

**Files:**
- Modify: `apps/api/src/modules/platform-onboarding/applications/tenant-applications.repository.ts`
- Modify: `apps/api/src/modules/platform-onboarding/invitations/tenant-setup-invitations.repository.ts`

**TenantApplicationsRepository** key queries:
- `create(application)` — `generateId('tap')`, insert
- `findById(id)`
- `findAll(filters?)` — for review listing (paginated)
- `updateStatus(id, status, reviewedBy?, denialReason?)` — for approve/deny

**TenantSetupInvitationsRepository** key queries:
- `create(invitation)` — `generateId('tsi')`, insert with hashed token
- `findByTokenHash(hash)` — for consume flow
- `findActiveByAdminUserId(adminUserId)` — check for existing unexpired invitation
- `markConsumed(id)`, `markRevoked(id)`, `markExpired(id)`

- [ ] Follow: failing test → implement → pass → commit for each.

```bash
git commit -m "feat(api): wire platform-onboarding repositories to Drizzle"
```

---

### Task 7: Wire all tenant repositories to Drizzle

**Files:**
- Modify: `apps/api/src/modules/tenants/tenant-lifecycle/tenant.repository.ts`
- Modify: `apps/api/src/modules/tenants/tenant-cognito/tenant-cognito-config.repository.ts`
- Modify: `apps/api/src/modules/tenants/tenant-domain/tenant-domain-config.repository.ts`
- Modify: `apps/api/src/modules/tenants/tenant-admin-relationships/admin-tenant-relationships.repository.ts`
- Modify: `apps/api/src/modules/tenants/tenant-business-profile/tenant-business-profile.repository.ts`

**TenantRepository** key queries:
- `create(tenant)` — `generateId('tnt')`, insert with status `provisioning`
- `findById(id)`, `findBySlug(slug)`
- `updateStatus(id, status)` — for lifecycle transitions
- `isSlugAvailable(slug)` — uniqueness check

**TenantCognitoConfigRepository** key queries:
- `create(config)` — links `userPoolId`, `appClientId`, `region` to tenant
- `findByTenantId(tenantId)`, `updateStatus(tenantId, status)`

**TenantDomainConfigRepository** key queries:
- `create(config)`
- `findByTenantId(tenantId)`, `findBySubdomain(subdomain)`, `findByCustomDomain(domain)`, `findByOriginHost(host)` — the last one checks both subdomain and custom_domain columns

**AdminTenantRelationshipsRepository** key queries:
- `create(relationship)` — `generateId('atr')`
- `findByAdminUserId(adminUserId)`, `findByTenantId(tenantId)`
- `findActiveRelationship(adminUserId, tenantId)`

**TenantBusinessProfileRepository** key queries:
- `upsert(tenantId, profile)` — create or update
- `findByTenantId(tenantId)`

- [ ] For each: failing test → implement → pass → commit.

```bash
git commit -m "feat(api): wire tenant repositories to Drizzle"
```

---

### Task 8: Wire `OutboxRepository` to Drizzle

**Files:**
- Modify: `apps/api/src/core/events/outbox.repository.ts`

Key queries:
- `create(event)` — insert outbox event with `generateId('evt')`, status `pending`
- `findPendingBatch(limit)` — fetch up to N pending events ordered by `created_at`
- `markDispatched(id)` — update status to `dispatched`
- `markFailed(id, error)` — update status to `failed`, increment attempt count
- `markDeadLetter(id)` — update status to `dead_letter` after retry exhaustion

- [ ] Follow: failing test → implement → pass → commit.

```bash
git commit -m "feat(api): wire OutboxRepository to Drizzle"
```

---

### Task 9: Wire `SentEmailRepository` and web-builder repositories to Drizzle

**Files:**
- Modify: `apps/api/src/core/email/sent-email.repository.ts`
- Modify: `apps/api/src/modules/web-builder/` repositories (all 6)

For the web-builder repositories, use the `tenant_theme_configs`, `tenant_page_configs`, `tenant_auth_page_configs`, `tenant_email_configs`, `tenant_release_sets`, `design_families` tables from `packages/db`.

- [ ] For each: failing test → implement → pass → commit.

```bash
git commit -m "feat(api): wire email and web-builder repositories to Drizzle"
```

---

### Task 10: Final verification — end-to-end smoke test with real database

- [ ] **Step 1: Start local PostgreSQL and run migrations**

```bash
cd packages/db && pnpm drizzle-kit migrate
```

- [ ] **Step 2: Start the API**

```bash
cd apps/api && pnpm start:dev
```

- [ ] **Step 3: Submit a tenant application and confirm it persists**

```bash
curl -s -X POST http://localhost:3000/platform-onboarding/submit \
  -H "Content-Type: application/json" \
  -d '{"requestedByName":"Test User","requestedByEmail":"test@example.com","businessName":"Test Store","instagramHandle":"@teststore"}' \
  | jq .
```

Then query the database directly:
```bash
psql $DATABASE_URL -c "SELECT id, business_name, status FROM tenant_applications ORDER BY created_at DESC LIMIT 1;"
```

Expected: the row appears in PostgreSQL, not just in memory.

- [ ] **Step 4: Run all API tests**

```bash
cd apps/api && pnpm test
```

Expected: all pass.

- [ ] **Step 5: Update master index**

Mark Plan 4 as `Complete`.
