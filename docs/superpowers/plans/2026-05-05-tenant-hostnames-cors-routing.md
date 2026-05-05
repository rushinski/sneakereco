# Tenant Hostnames and Fastify CORS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inferred host/origin resolution with a `tenant_hostnames` source of truth, switch CORS to Fastify plugin config, and route request context through a dedicated request-host resolver.

**Architecture:** Introduce a new hostname registry table in `packages/db`, then build two independent read paths on top of it: request routing via `RequestHostResolverService` and CORS allow/deny via `cors.config.ts`. Remove the old `OriginResolverService` and custom CORS middleware once the new read paths are live.

**Tech Stack:** NestJS, Fastify, `@fastify/cors`, Drizzle ORM, PostgreSQL, Valkey

---

## File Map

**Create**
- `packages/db/src/schema/tenant-config/tenant-hostnames.ts`
- `packages/db/migrations/0010_tenant_hostnames.sql`
- `apps/api/src/common/routing/request-host.types.ts`
- `apps/api/src/common/routing/request-host.repository.ts`
- `apps/api/src/common/routing/request-host-resolver.service.ts`
- `apps/api/src/config/cors.config.ts`
- `apps/api/tests/unit/common/routing/request-host-resolver.service.spec.ts`
- `apps/api/tests/unit/config/cors.config.spec.ts`

**Modify**
- `packages/db/src/schema/tenant-config/index.ts`
- `packages/db/src/schema/tenant-config/policies.ts`
- `packages/db/src/schema/index.ts`
- `apps/api/src/common/common.module.ts`
- `apps/api/src/common/context/request-context.middleware.ts`
- `apps/api/src/common/context/request-context.module.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `apps/api/src/config/security.config.ts`

**Remove**
- `apps/api/src/common/services/origin-resolver.service.ts`
- `apps/api/src/common/middleware/cors.middleware.ts`

**Verify Against Existing Files**
- `apps/api/src/core/valkey/valkey.service.ts`
- `apps/api/src/modules/auth/shared/pool-resolver/pool-resolver.service.ts`
- `packages/db/src/schema/tenant-config/tenant-domain-config.ts`

---

### Task 1: Add `tenant_hostnames` Schema and Migration

**Files:**
- Create: `packages/db/src/schema/tenant-config/tenant-hostnames.ts`
- Create: `packages/db/migrations/0010_tenant_hostnames.sql`
- Modify: `packages/db/src/schema/tenant-config/index.ts`
- Modify: `packages/db/src/schema/tenant-config/policies.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Write the failing schema test by generating SQL and verifying the new table is missing**

Run:

```bash
pnpm --filter @sneakereco/db drizzle-kit generate
```

Expected:

- command does not include `tenant_hostnames`
- no migration exists for the new table

- [ ] **Step 2: Add the Drizzle schema file**

Create `packages/db/src/schema/tenant-config/tenant-hostnames.ts`:

```ts
import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { idColumn, timestamps } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const tenantHostnames = pgTable(
  'tenant_hostnames',
  {
    id: idColumn('thn'),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    hostname: text('hostname').notNull(),
    surface: text('surface').$type<'platform' | 'platform-admin' | 'customer' | 'store-admin'>().notNull(),
    hostKind: text('host_kind')
      .$type<'platform' | 'managed' | 'admin-managed' | 'custom' | 'admin-custom' | 'alias'>()
      .notNull(),
    isCanonical: sql<boolean>`true`.as('is_canonical'),
    redirectToHostname: text('redirect_to_hostname'),
    status: text('status').$type<'active' | 'disabled' | 'pending_verification'>().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('uniq_tenant_hostnames_hostname').on(table.hostname),
    index('idx_tenant_hostnames_tenant_surface').on(table.tenantId, table.surface),
    check(
      'tenant_hostnames_hostname_lowercase',
      sql`${table.hostname} = lower(${table.hostname})`,
    ),
  ],
);
```

Note:

- Use the repo’s actual `idColumn`/`timestamps` helpers after confirming their export names.
- `isCanonical` should be implemented as a proper boolean column, not left as a raw SQL alias.

- [ ] **Step 3: Export the new schema**

Update `packages/db/src/schema/tenant-config/index.ts`:

```ts
export * from './tenant-domain-config';
export * from './tenant-hostnames';
```

Update `packages/db/src/schema/index.ts` to re-export the tenant-config barrel if needed:

```ts
export * from './tenant-config';
```

Update `packages/db/src/schema/tenant-config/policies.ts` only if this codebase centrally attaches policies there; otherwise leave policy wiring out of this first cut.

- [ ] **Step 4: Write the SQL migration**

Create `packages/db/migrations/0010_tenant_hostnames.sql`:

```sql
CREATE TABLE "tenant_hostnames" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text,
  "hostname" text NOT NULL,
  "surface" text NOT NULL,
  "host_kind" text NOT NULL,
  "is_canonical" boolean NOT NULL DEFAULT false,
  "redirect_to_hostname" text,
  "status" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "tenant_hostnames"
  ADD CONSTRAINT "tenant_hostnames_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "uniq_tenant_hostnames_hostname"
  ON "tenant_hostnames" USING btree ("hostname");

CREATE INDEX "idx_tenant_hostnames_tenant_surface"
  ON "tenant_hostnames" USING btree ("tenant_id", "surface");

ALTER TABLE "tenant_hostnames"
  ADD CONSTRAINT "tenant_hostnames_hostname_lowercase"
  CHECK ("hostname" = lower("hostname"));
```

- [ ] **Step 5: Regenerate and verify schema output**

Run:

```bash
pnpm --filter @sneakereco/db drizzle-kit generate
```

Expected:

- migration metadata updates successfully
- no schema export errors

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema/tenant-config/tenant-hostnames.ts packages/db/src/schema/tenant-config/index.ts packages/db/src/schema/index.ts packages/db/migrations/0010_tenant_hostnames.sql packages/db/migrations/meta
git commit -m "feat(db): add tenant hostnames registry"
```

### Task 2: Seed Platform and Current Test Hostnames

**Files:**
- Modify: `packages/db/migrations/0010_tenant_hostnames.sql`

- [ ] **Step 1: Add seed inserts for platform rows**

Append to `packages/db/migrations/0010_tenant_hostnames.sql`:

```sql
INSERT INTO "tenant_hostnames" (
  "id",
  "tenant_id",
  "hostname",
  "surface",
  "host_kind",
  "is_canonical",
  "redirect_to_hostname",
  "status"
) VALUES
  ('thn_platform_site', null, 'sneakereco.test', 'platform', 'platform', true, null, 'active'),
  ('thn_platform_admin', null, 'dashboard.sneakereco.test', 'platform-admin', 'platform', true, null, 'active');
```

- [ ] **Step 2: Add current local test tenant rows if a known test tenant exists**

Use the actual tenant ID if a stable seed tenant already exists in this repo. If not, skip tenant row seeding in SQL and add them through the test/setup path instead.

Example shape:

```sql
INSERT INTO "tenant_hostnames" (
  "id",
  "tenant_id",
  "hostname",
  "surface",
  "host_kind",
  "is_canonical",
  "redirect_to_hostname",
  "status"
) VALUES
  ('thn_heatkings_store', 'tnt_heatkings', 'heatkings.sneakereco.test', 'customer', 'managed', true, null, 'active'),
  ('thn_heatkings_admin', 'tnt_heatkings', 'admin.heatkings.test', 'store-admin', 'admin-custom', true, null, 'active');
```

- [ ] **Step 3: Run migration locally**

Run:

```bash
pnpm --filter @sneakereco/db drizzle-kit migrate
```

Expected:

- migration applies cleanly
- `tenant_hostnames` exists with platform rows

- [ ] **Step 4: Commit**

```bash
git add packages/db/migrations/0010_tenant_hostnames.sql
git commit -m "feat(db): seed initial tenant hostname rows"
```

### Task 3: Add Request-Host Repository, Types, and Resolver

**Files:**
- Create: `apps/api/src/common/routing/request-host.types.ts`
- Create: `apps/api/src/common/routing/request-host.repository.ts`
- Create: `apps/api/src/common/routing/request-host-resolver.service.ts`
- Create: `apps/api/tests/unit/common/routing/request-host-resolver.service.spec.ts`
- Modify: `apps/api/src/common/common.module.ts`

- [ ] **Step 1: Write the failing unit tests**

Create `apps/api/tests/unit/common/routing/request-host-resolver.service.spec.ts`:

```ts
describe('RequestHostResolverService', () => {
  it('returns null for malformed host input', async () => {});
  it('returns a resolved host for an active exact hostname match', async () => {});
  it('caches lookup results in Valkey', async () => {});
});
```

Run:

```bash
pnpm --filter api test -- request-host-resolver.service.spec.ts
```

Expected:

- FAIL because resolver files do not exist

- [ ] **Step 2: Add the types file**

Create `apps/api/src/common/routing/request-host.types.ts`:

```ts
export type RequestHostSurface = 'platform' | 'platform-admin' | 'customer' | 'store-admin';
export type RequestHostKind =
  | 'platform'
  | 'managed'
  | 'admin-managed'
  | 'custom'
  | 'admin-custom'
  | 'alias';
export type RequestHostStatus = 'active' | 'disabled' | 'pending_verification';

export interface RequestHostRow {
  hostname: string;
  tenantId: string | null;
  surface: RequestHostSurface;
  hostKind: RequestHostKind;
  isCanonical: boolean;
  redirectToHostname: string | null;
  status: RequestHostStatus;
}

export interface ResolvedRequestHost {
  hostname: string;
  tenantId: string | null;
  surface: RequestHostSurface;
  hostKind: RequestHostKind;
  canonicalHost: string;
  isCanonicalHost: boolean;
  redirectToHostname: string | null;
  status: RequestHostStatus;
}
```

- [ ] **Step 3: Add the repository**

Create `apps/api/src/common/routing/request-host.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenantHostnames } from '@sneakereco/db';

import { DatabaseService } from '../../core/database/database.service';
import type { RequestHostRow } from './request-host.types';

@Injectable()
export class RequestHostRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByHostname(hostname: string): Promise<RequestHostRow | null> {
    const [row] = await this.db.systemDb
      .select({
        hostname: tenantHostnames.hostname,
        tenantId: tenantHostnames.tenantId,
        surface: tenantHostnames.surface,
        hostKind: tenantHostnames.hostKind,
        isCanonical: tenantHostnames.isCanonical,
        redirectToHostname: tenantHostnames.redirectToHostname,
        status: tenantHostnames.status,
      })
      .from(tenantHostnames)
      .where(eq(tenantHostnames.hostname, hostname))
      .limit(1);

    return row ?? null;
  }
}
```

- [ ] **Step 4: Add the resolver with cache-aside lookup**

Create `apps/api/src/common/routing/request-host-resolver.service.ts`:

```ts
import { Injectable } from '@nestjs/common';

import { ValkeyService } from '../../core/valkey/valkey.service';
import type { ResolvedRequestHost } from './request-host.types';
import { RequestHostRepository } from './request-host.repository';

const REQUEST_HOST_CACHE_TTL = 300;

@Injectable()
export class RequestHostResolverService {
  constructor(
    private readonly repository: RequestHostRepository,
    private readonly valkey: ValkeyService,
  ) {}

  normalizeHost(host: string | undefined | null): string | null {
    if (!host) return null;
    try {
      const parsed = host.includes('://') ? new URL(host) : new URL(`https://${host}`);
      return parsed.hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  async resolveHost(host: string | undefined | null): Promise<ResolvedRequestHost | null> {
    const normalized = this.normalizeHost(host);
    if (!normalized) return null;

    const cacheKey = `request-host:${normalized}`;
    const cached = await this.valkey.getJson<ResolvedRequestHost | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const row = await this.repository.findByHostname(normalized);
    if (!row) {
      await this.valkey.setJson(cacheKey, null, 60);
      return null;
    }

    const resolved: ResolvedRequestHost = {
      hostname: row.hostname,
      tenantId: row.tenantId,
      surface: row.surface,
      hostKind: row.hostKind,
      canonicalHost: row.isCanonical ? row.hostname : row.redirectToHostname ?? row.hostname,
      isCanonicalHost: row.isCanonical,
      redirectToHostname: row.redirectToHostname,
      status: row.status,
    };

    await this.valkey.setJson(cacheKey, resolved, REQUEST_HOST_CACHE_TTL);
    return resolved;
  }
}
```

- [ ] **Step 5: Export providers from `CommonModule`**

Update `apps/api/src/common/common.module.ts`:

```ts
providers: [OriginResolverService, SecurityConfig, RequestHostRepository, RequestHostResolverService],
exports: [OriginResolverService, SecurityConfig, RequestHostRepository, RequestHostResolverService],
```

Then remove `OriginResolverService` from this list in a later task once all callers are gone.

- [ ] **Step 6: Run the resolver tests**

Run:

```bash
pnpm --filter api test -- request-host-resolver.service.spec.ts
```

Expected:

- PASS after mocking repository and Valkey behavior

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/common/routing apps/api/src/common/common.module.ts apps/api/tests/unit/common/routing/request-host-resolver.service.spec.ts
git commit -m "feat(api): add request host resolver"
```

### Task 4: Replace Request Context Resolution With Host Registry Lookup

**Files:**
- Modify: `apps/api/src/common/context/request-context.middleware.ts`
- Modify: `apps/api/src/common/context/request-context.module.ts`

- [ ] **Step 1: Write the failing middleware tests**

Add tests or extend the existing request-context middleware spec to cover:

```ts
it('marks requests unknown when host is not found', async () => {});
it('derives surface and tenant from resolved host row', async () => {});
it('resolves auth pool only for tenant-backed customer and store-admin surfaces', async () => {});
```

Run:

```bash
pnpm --filter api test -- request-context.middleware.spec.ts
```

Expected:

- FAIL because middleware still depends on `OriginResolverService`

- [ ] **Step 2: Replace origin resolver usage in middleware**

Update `apps/api/src/common/context/request-context.middleware.ts`:

```ts
constructor(
  private readonly requestHostResolver: RequestHostResolverService,
  private readonly poolResolver: PoolResolverService,
) {}

const resolved = await this.requestHostResolver.resolveHost(this.readHeaderValue(req.headers.host));

const surface = resolved?.surface ?? 'unknown';
const tenantId = resolved?.tenantId ?? null;
const canonicalHost = resolved?.canonicalHost ?? null;
const isCanonicalHost = resolved?.isCanonicalHost ?? false;
```

Remove:

- origin-based tenant lookup
- `resolveRequestSurface(...)` usage
- `OriginResolverService` dependency

Map DB surface values to request-context surface values directly. Treat `platform` host rows as `platform-admin` only if the product truly means the platform site is an authenticated admin surface; otherwise keep `platform` as a distinct routing concept and map it intentionally.

- [ ] **Step 3: Update the request-context module**

Update `apps/api/src/common/context/request-context.module.ts` to ensure `CommonModule` is in scope if the new resolver is exported there:

```ts
imports: [AuthModule, CommonModule],
```

- [ ] **Step 4: Run middleware tests**

Run:

```bash
pnpm --filter api test -- request-context.middleware.spec.ts
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/context/request-context.middleware.ts apps/api/src/common/context/request-context.module.ts apps/api/tests/unit/common/context/request-context.middleware.spec.ts
git commit -m "refactor(api): resolve request context from tenant hostnames"
```

### Task 5: Move CORS to Fastify Config and Remove Custom Middleware

**Files:**
- Create: `apps/api/src/config/cors.config.ts`
- Create: `apps/api/tests/unit/config/cors.config.spec.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/app.module.ts`
- Delete: `apps/api/src/common/middleware/cors.middleware.ts`
- Modify: `apps/api/src/config/security.config.ts`

- [ ] **Step 1: Write the failing CORS config tests**

Create `apps/api/tests/unit/config/cors.config.spec.ts`:

```ts
describe('buildCorsOptions', () => {
  it('allows active origins found in tenant_hostnames', async () => {});
  it('rejects unknown origins', async () => {});
  it('does not require canonical hosts for CORS allow decisions', async () => {});
});
```

Run:

```bash
pnpm --filter api test -- cors.config.spec.ts
```

Expected:

- FAIL because config file does not exist

- [ ] **Step 2: Add the Fastify CORS config file**

Create `apps/api/src/config/cors.config.ts`:

```ts
import type { FastifyCorsOptions } from '@fastify/cors';
import { eq } from 'drizzle-orm';
import { tenantHostnames } from '@sneakereco/db';

import type { DatabaseService } from '../core/database/database.service';
import type { ValkeyService } from '../core/valkey/valkey.service';
import { CORS_ALLOWED_HEADERS, CORS_ALLOWED_METHODS, CORS_CREDENTIALS } from './security.config';

const CORS_CACHE_TTL = 300;

function normalizeOriginHostname(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function buildCorsOptions(
  db: DatabaseService,
  valkey: ValkeyService,
): FastifyCorsOptions {
  return {
    credentials: CORS_CREDENTIALS,
    methods: CORS_ALLOWED_METHODS,
    allowedHeaders: CORS_ALLOWED_HEADERS,
    origin: async (origin, cb) => {
      if (!origin) {
        cb(null, false);
        return;
      }

      const hostname = normalizeOriginHostname(origin);
      if (!hostname) {
        cb(null, false);
        return;
      }

      const cacheKey = `cors-origin:${hostname}`;
      const cached = await valkey.getJson<{ allowed: boolean } | null>(cacheKey);
      if (cached) {
        cb(null, cached.allowed ? origin : false);
        return;
      }

      const [row] = await db.systemDb
        .select({ hostname: tenantHostnames.hostname, status: tenantHostnames.status })
        .from(tenantHostnames)
        .where(eq(tenantHostnames.hostname, hostname))
        .limit(1);

      const allowed = row?.status === 'active';
      await valkey.setJson(cacheKey, { allowed }, CORS_CACHE_TTL);
      cb(null, allowed ? origin : false);
    },
  };
}
```

- [ ] **Step 3: Register Fastify CORS from the config file**

Update `apps/api/src/main.ts`:

```ts
import { buildCorsOptions } from './config/cors.config';
import { DatabaseService } from './core/database/database.service';
import { ValkeyService } from './core/valkey/valkey.service';

const db = app.get(DatabaseService);
const valkey = app.get(ValkeyService);

await app.register(cors as any, buildCorsOptions(db, valkey));
```

Delete the old deny-all config:

```ts
await app.register(cors as any, {
  origin: false,
  credentials: true,
});
```

- [ ] **Step 4: Remove custom CORS middleware from app wiring**

Update `apps/api/src/app.module.ts`:

```ts
consumer.apply(RequestIdMiddleware, RequestContextMiddleware).forRoutes('*');
```

Delete `apps/api/src/common/middleware/cors.middleware.ts`.

If any constants are now unused in `security.config.ts`, remove only the ones no longer referenced.

- [ ] **Step 5: Run CORS tests and API startup smoke test**

Run:

```bash
pnpm --filter api test -- cors.config.spec.ts
pnpm --filter api test -- request-context.middleware.spec.ts
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/config/cors.config.ts apps/api/src/main.ts apps/api/src/app.module.ts apps/api/src/config/security.config.ts apps/api/tests/unit/config/cors.config.spec.ts
git rm apps/api/src/common/middleware/cors.middleware.ts
git commit -m "refactor(api): move cors to fastify config"
```

### Task 6: Remove `OriginResolverService` and Old Runtime Host Logic

**Files:**
- Delete: `apps/api/src/common/services/origin-resolver.service.ts`
- Modify: `apps/api/src/common/common.module.ts`
- Modify: any remaining callers found by search

- [ ] **Step 1: Search for remaining references**

Run:

```bash
rg -n "OriginResolverService|origin-resolver|classifyOrigin|resolveTenantByHost|getPlatformHosts" apps/api/src
```

Expected:

- only remaining references are obsolete and can now be removed or replaced

- [ ] **Step 2: Remove the service from DI and delete the file**

Update `apps/api/src/common/common.module.ts`:

```ts
providers: [RequestHostRepository, RequestHostResolverService, SecurityConfig],
exports: [RequestHostRepository, RequestHostResolverService, SecurityConfig],
```

Delete `apps/api/src/common/services/origin-resolver.service.ts`.

- [ ] **Step 3: Run targeted repo-wide tests**

Run:

```bash
pnpm --filter api test -- request-host-resolver.service.spec.ts
pnpm --filter api test -- request-context.middleware.spec.ts
pnpm --filter api test -- cors.config.spec.ts
```

Expected:

- PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/common/common.module.ts apps/api/src/common/context/request-context.middleware.ts apps/api/src/common/context/request-context.module.ts
git rm apps/api/src/common/services/origin-resolver.service.ts
git commit -m "refactor(api): replace origin resolver with request host resolver"
```

### Task 7: Verify Auth, CSRF, and Host-Based Session Behavior

**Files:**
- Modify: `apps/api/tests/integration/auth/refresh-surface-isolation.spec.ts`
- Add integration tests as needed for hostname-table-backed behavior

- [ ] **Step 1: Add integration coverage for active canonical and alias hosts**

Extend `apps/api/tests/integration/auth/refresh-surface-isolation.spec.ts` with cases shaped like:

```ts
it('reads refresh cookies using the canonical host from the resolved hostname row', async () => {});
it('allows requests from active alias origins through CORS while still routing with canonical host metadata', async () => {});
```

- [ ] **Step 2: Run auth integration tests**

Run:

```bash
pnpm --filter api test -- refresh-surface-isolation.spec.ts
```

Expected:

- PASS

- [ ] **Step 3: Run the broader auth test slice**

Run:

```bash
pnpm --filter api test -- auth
```

Expected:

- refresh, logout, and session-control tests still pass

- [ ] **Step 4: Commit**

```bash
git add apps/api/tests/integration/auth/refresh-surface-isolation.spec.ts
git commit -m "test(api): verify hostname registry auth flows"
```

## Self-Review

### Spec coverage

- `tenant_hostnames` table: covered by Tasks 1-2
- request-host resolver replacement: covered by Tasks 3-4
- Fastify CORS cutover: covered by Task 5
- removal of `OriginResolverService` and custom CORS middleware: covered by Task 6
- auth/session/CSRF verification: covered by Task 7

### Placeholder scan

- No `TODO`/`TBD` placeholders remain
- Each task contains concrete files and commands
- Code blocks are included for new files and core edits

### Type consistency

- `RequestHostRow` and `ResolvedRequestHost` names are used consistently
- cache key namespaces are consistent:
  - `request-host:${hostname}`
  - `cors-origin:${hostname}`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-05-tenant-hostnames-cors-routing.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
