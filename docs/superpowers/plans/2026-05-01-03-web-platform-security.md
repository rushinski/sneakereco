# Web Platform Security & Tenant Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace heuristic tenant derivation with a trusted lookup, harden all BFF route handlers with consistent cookie/CSRF/origin policy, add server-side authorization to all sensitive Next.js pages, and align NestJS CORS to the same trusted domain model.

**Architecture:** A `TenantResolutionService` in `modules/tenants/` resolves hostnames to trusted tenant context via `tenant_domain_configs`. The BFF layer in both apps enforces a single consistent policy contract (origin check → CSRF check → cookie handling → error normalization) for all auth mutation routes. Next.js pages redirect unauthenticated users server-side, not client-side. NestJS CORS explicitly resolves tenant origins from the same trust model.

**Tech Stack:** Next.js 16 App Router, NestJS 10 + Fastify, `@fastify/cors`, `packages/db` Drizzle schema.

**Source spec:** `docs/superpowers/specs/2026-04-30-web-platform-security-and-tenant-resolution-design.md`

**Prerequisite:** Plan 1 (Foundation Hardening) must be complete — the global exception filter and validated config access are assumed.

---

### Task 1: Define the trusted domain model in the API

**Files:**
- Modify: `apps/api/src/core/config/domain.config.ts`
- Create: `apps/api/src/core/security/trusted-host.service.ts`
- Create: `apps/api/src/core/security/trusted-host.service.spec.ts`

- [ ] **Step 1: Read the current `domain.config.ts`**

```bash
cat apps/api/src/core/config/domain.config.ts
```

Note what it currently defines. The goal is to lock the recognition rules for:
- `dashboard.sneakereco.com` → platform admin domain
- `*.sneakereco.com` → tenant subdomains (where `*` is a known slug)
- `*.sneakereco.com/admin` → tenant admin path on subdomain
- Custom domains registered in `tenant_domain_configs`

- [ ] **Step 2: Write the failing test for `TrustedHostService`**

Create `apps/api/src/core/security/trusted-host.service.spec.ts`:

```typescript
import { TrustedHostService } from './trusted-host.service';

describe('TrustedHostService', () => {
  const BASE_DOMAIN = 'sneakereco.com';
  const PLATFORM_DASHBOARD = 'dashboard.sneakereco.com';
  let service: TrustedHostService;

  beforeEach(() => {
    service = new TrustedHostService(BASE_DOMAIN, PLATFORM_DASHBOARD);
  });

  it('identifies platform dashboard host', () => {
    expect(service.classify('dashboard.sneakereco.com')).toEqual({
      type: 'platform',
      tenantSlug: null,
      customDomain: false,
    });
  });

  it('identifies tenant subdomain', () => {
    expect(service.classify('kicks.sneakereco.com')).toEqual({
      type: 'tenant-storefront',
      tenantSlug: 'kicks',
      customDomain: false,
    });
  });

  it('identifies API host as internal', () => {
    expect(service.classify('api.sneakereco.com')).toEqual({
      type: 'api',
      tenantSlug: null,
      customDomain: false,
    });
  });

  it('returns unknown for unrecognized host without custom domain lookup', () => {
    expect(service.classify('evil.example.com')).toEqual({
      type: 'unknown',
      tenantSlug: null,
      customDomain: false,
    });
  });

  it('marks a host as possible custom domain for external lookup', () => {
    const result = service.classify('kicks.mystore.com');
    expect(result.type).toBe('unknown');
    expect(result.customDomain).toBe(true);
  });
});
```

- [ ] **Step 3: Run to confirm FAIL**

```bash
cd apps/api && pnpm test -- --testPathPattern="trusted-host.service"
```

- [ ] **Step 4: Create `apps/api/src/core/security/trusted-host.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';

export interface HostClassification {
  type: 'platform' | 'api' | 'tenant-storefront' | 'unknown';
  tenantSlug: string | null;
  customDomain: boolean;
}

@Injectable()
export class TrustedHostService {
  constructor(
    private readonly baseDomain: string,
    private readonly platformDashboardHost: string,
  ) {}

  classify(host: string): HostClassification {
    const bare = host.split(':')[0].toLowerCase();

    if (bare === this.platformDashboardHost) {
      return { type: 'platform', tenantSlug: null, customDomain: false };
    }

    if (bare === `api.${this.baseDomain}`) {
      return { type: 'api', tenantSlug: null, customDomain: false };
    }

    if (bare.endsWith(`.${this.baseDomain}`)) {
      const slug = bare.slice(0, bare.length - this.baseDomain.length - 1);
      // Exclude known platform subdomains
      if (['api', 'dashboard', 'www'].includes(slug)) {
        return { type: 'unknown', tenantSlug: null, customDomain: false };
      }
      return { type: 'tenant-storefront', tenantSlug: slug, customDomain: false };
    }

    // Could be a custom domain — mark for external lookup
    return { type: 'unknown', tenantSlug: null, customDomain: true };
  }
}
```

- [ ] **Step 5: Run tests — confirm PASS**

```bash
cd apps/api && pnpm test -- --testPathPattern="trusted-host.service"
```

- [ ] **Step 6: Register `TrustedHostService` in `SecurityModule`**

In `apps/api/src/core/security/security.module.ts`, add `TrustedHostService` to providers and exports. Inject `DOMAIN_CONFIG` to pass `baseDomain` and `platformDashboardHost` from the config.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/core/security/trusted-host.service.ts
git add apps/api/src/core/security/trusted-host.service.spec.ts
git add apps/api/src/core/security/security.module.ts
git commit -m "feat(api): add TrustedHostService for deterministic host classification"
```

---

### Task 2: Build `TenantResolutionService` backed by `tenant_domain_configs`

**Files:**
- Create: `apps/api/src/modules/tenants/tenant-domain/tenant-resolution.service.ts`
- Create: `apps/api/src/modules/tenants/tenant-domain/tenant-resolution.service.spec.ts`

**Note:** This service calls `TenantDomainConfigRepository`. At the time Plan 3 runs, that repository is still in-memory (Plan 4 fixes it). That is acceptable — the service interface is what matters here. Tests mock the repository.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/modules/tenants/tenant-domain/tenant-resolution.service.spec.ts`:

```typescript
import { TenantResolutionService } from './tenant-resolution.service';
import { TrustedHostService } from '../../../core/security/trusted-host.service';

const mockDomainRepo = {
  findBySubdomain: jest.fn(),
  findByCustomDomain: jest.fn(),
  findByOriginHost: jest.fn(),
};

const trustedHostService = new TrustedHostService('sneakereco.com', 'dashboard.sneakereco.com');

describe('TenantResolutionService', () => {
  let service: TenantResolutionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TenantResolutionService(mockDomainRepo as any, trustedHostService);
  });

  it('resolves tenant from subdomain', async () => {
    mockDomainRepo.findBySubdomain.mockResolvedValue({ tenantId: 'tnt_abc', subdomain: 'kicks' });
    const result = await service.resolveFromHost('kicks.sneakereco.com');
    expect(result).toEqual({ tenantId: 'tnt_abc', source: 'subdomain', slug: 'kicks' });
  });

  it('resolves tenant from custom domain', async () => {
    mockDomainRepo.findByCustomDomain.mockResolvedValue({ tenantId: 'tnt_xyz', subdomain: 'kicks' });
    const result = await service.resolveFromHost('kicks.mystore.com');
    expect(result).toEqual({ tenantId: 'tnt_xyz', source: 'custom-domain', slug: 'kicks' });
  });

  it('returns null for unknown host not in tenant_domain_configs', async () => {
    mockDomainRepo.findByCustomDomain.mockResolvedValue(null);
    const result = await service.resolveFromHost('evil.example.com');
    expect(result).toBeNull();
  });

  it('returns platform context for platform dashboard host', async () => {
    const result = await service.resolveFromHost('dashboard.sneakereco.com');
    expect(result).toEqual({ tenantId: null, source: 'platform', slug: null });
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd apps/api && pnpm test -- --testPathPattern="tenant-resolution.service"
```

- [ ] **Step 3: Create `apps/api/src/modules/tenants/tenant-domain/tenant-resolution.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { TenantDomainConfigRepository } from './tenant-domain-config.repository';
import { TrustedHostService } from '../../../core/security/trusted-host.service';

export interface TenantResolutionResult {
  tenantId: string | null;
  source: 'subdomain' | 'custom-domain' | 'platform';
  slug: string | null;
}

@Injectable()
export class TenantResolutionService {
  constructor(
    private readonly domainConfigRepo: TenantDomainConfigRepository,
    private readonly trustedHostService: TrustedHostService,
  ) {}

  async resolveFromHost(host: string): Promise<TenantResolutionResult | null> {
    const classification = this.trustedHostService.classify(host);

    if (classification.type === 'platform') {
      return { tenantId: null, source: 'platform', slug: null };
    }

    if (classification.type === 'tenant-storefront' && classification.tenantSlug) {
      const config = await this.domainConfigRepo.findBySubdomain(classification.tenantSlug);
      if (!config) return null;
      return { tenantId: config.tenantId, source: 'subdomain', slug: classification.tenantSlug };
    }

    if (classification.customDomain) {
      const config = await this.domainConfigRepo.findByCustomDomain(host);
      if (!config) return null;
      return { tenantId: config.tenantId, source: 'custom-domain', slug: config.subdomain };
    }

    return null;
  }
}
```

- [ ] **Step 4: Run tests — confirm PASS**

```bash
cd apps/api && pnpm test -- --testPathPattern="tenant-resolution.service"
```

- [ ] **Step 5: Register `TenantResolutionService` in `TenantsModule` and export it**

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/tenants/tenant-domain/tenant-resolution.service.ts
git add apps/api/src/modules/tenants/tenant-domain/tenant-resolution.service.spec.ts
git commit -m "feat(api): add TenantResolutionService with trusted host lookup"
```

---

### Task 3: Remove heuristic tenant derivation from web app

**Files:**
- Read: `apps/web/src/lib/auth/tenant.ts` (the heuristic derivation code)
- Modify: `apps/web/src/lib/auth/tenant.ts`
- Modify: any BFF route handler that calls the heuristic

- [ ] **Step 1: Read the current tenant derivation**

```bash
cat apps/web/src/lib/auth/tenant.ts
```

Identify any pattern like `tnt_${slug}`, string-based slug extraction from host, or fabricated tenant IDs.

- [ ] **Step 2: Replace heuristic with API lookup**

Replace any fabricated tenant derivation with a call to a Next.js server-side lookup endpoint. BFF route handlers that need tenant context should:

1. Extract the `host` header from the incoming request
2. Call the NestJS API's `GET /tenants/resolve?host={host}` endpoint (server-to-server, no cookie)
3. Use the returned `tenantId` from the trusted resolution

Create the resolution helper:

```typescript
// apps/web/src/lib/auth/tenant.ts

import { apiBaseUrl } from './boundary/config';

export interface TenantContext {
  tenantId: string;
  slug: string;
  source: 'subdomain' | 'custom-domain';
}

export async function resolveTenantFromHost(host: string): Promise<TenantContext | null> {
  const res = await fetch(`${apiBaseUrl}/tenants/resolve?host=${encodeURIComponent(host)}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.tenantId) return null;
  return data as TenantContext;
}
```

- [ ] **Step 3: Add the resolution endpoint to the NestJS API**

In `apps/api/src/modules/tenants/`, add a controller endpoint:

```typescript
// In tenants.controller.ts (create if not exists):
@Get('resolve')
async resolveHost(@Query('host') host: string) {
  const result = await this.tenantResolutionService.resolveFromHost(host);
  if (!result || !result.tenantId) {
    throw new NotFoundException('Tenant not found for host');
  }
  return result;
}
```

This endpoint is intentionally public (no auth guard) since it's called server-to-server before a session exists.

- [ ] **Step 4: Update BFF route handlers to use `resolveTenantFromHost`**

Grep for all BFF route handlers in `apps/web/src/app/api/` that currently fabricate a tenant ID:

```bash
grep -r "tnt_\|tenantId" apps/web/src/app/api/ --include="*.ts" -l
```

For each found handler, replace the heuristic with:

```typescript
import { headers } from 'next/headers';
import { resolveTenantFromHost } from '../../../lib/auth/tenant';

export async function POST(request: Request) {
  const host = (await headers()).get('host') ?? '';
  const tenant = await resolveTenantFromHost(host);
  if (!tenant) {
    return Response.json({ code: 'TENANT_NOT_FOUND', message: 'Unknown host' }, { status: 404 });
  }
  // use tenant.tenantId in downstream API calls
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auth/tenant.ts
git add apps/api/src/modules/tenants/
git commit -m "feat: replace heuristic tenant derivation with trusted resolution lookup"
```

---

### Task 4: Harden BFF route handlers — consistent policy contract

**Files:**
- Create: `apps/web/src/lib/auth/bff-policy.ts`
- Create: `apps/platform/src/lib/auth/bff-policy.ts`
- Modify: each BFF route handler in `apps/web/src/app/api/auth/` and `apps/platform/src/app/api/auth/`

- [ ] **Step 1: Define the BFF policy contract helper**

Create `apps/web/src/lib/auth/bff-policy.ts`:

```typescript
import { headers } from 'next/headers';

export interface BffPolicyResult {
  ok: true;
  origin: string;
} | {
  ok: false;
  response: Response;
}

const ALLOWED_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_ALLOWED_ORIGIN ?? '',
  ...(process.env.STATIC_ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? []),
].filter(Boolean));

export async function enforceBffPolicy(
  request: Request,
  options: { requireCsrf?: boolean } = {},
): Promise<BffPolicyResult> {
  const hdrs = await headers();
  const origin = request.headers.get('origin') ?? '';
  const host = hdrs.get('host') ?? '';

  // Origin must match same host or be in explicit allowlist
  const expectedOrigin = `https://${host}`;
  if (origin && origin !== expectedOrigin && !ALLOWED_ORIGINS.has(origin)) {
    return {
      ok: false,
      response: Response.json(
        { code: 'FORBIDDEN', message: 'Origin not allowed' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }

  if (options.requireCsrf) {
    const csrfToken = request.headers.get('x-csrf-token');
    const csrfCookie = hdrs.get('cookie')?.match(/__Host-sneakereco_csrf=([^;]+)/)?.[1];
    if (!csrfToken || !csrfCookie || csrfToken !== csrfCookie) {
      return {
        ok: false,
        response: Response.json(
          { code: 'FORBIDDEN', message: 'CSRF validation failed' },
          { status: 403, headers: { 'Cache-Control': 'no-store' } },
        ),
      };
    }
  }

  return { ok: true, origin };
}

export function noStoreHeaders(): HeadersInit {
  return { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
}
```

Create the same file for platform (`apps/platform/src/lib/auth/bff-policy.ts`) — identical logic, different cookie name prefix.

- [ ] **Step 2: Apply `enforceBffPolicy` to every state-changing BFF route handler**

State-changing routes (POST/DELETE) must call `enforceBffPolicy` with `requireCsrf: true` before any other logic. Example for `apps/web/src/app/api/auth/login/route.ts`:

```typescript
import { enforceBffPolicy, noStoreHeaders } from '../../../../lib/auth/bff-policy';

export async function POST(request: Request) {
  const policy = await enforceBffPolicy(request, { requireCsrf: true });
  if (!policy.ok) return policy.response;

  // ... rest of login handler
  return Response.json(result, { headers: noStoreHeaders() });
}
```

Apply to: login, logout, logout-all, refresh, mfa, register, forgot-password, reset-password, verify-email, otp/request, otp/complete, admin/login, admin/setup/*.

Read-only routes (GET like `/api/auth/me`, `/api/auth/csrf`) only need origin check — no CSRF requirement.

- [ ] **Step 3: Verify every auth BFF route handler has been updated**

```bash
grep -r "enforceBffPolicy" apps/web/src/app/api/auth/ --include="*.ts" -l | wc -l
grep -r "export async function POST\|export async function DELETE" apps/web/src/app/api/auth/ --include="*.ts" -l | wc -l
```

Both counts should match (every POST/DELETE route calls the policy).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/auth/bff-policy.ts
git add apps/platform/src/lib/auth/bff-policy.ts
git add apps/web/src/app/api/auth/
git add apps/platform/src/app/api/auth/
git commit -m "feat(bff): enforce consistent origin/CSRF/cache policy on all auth BFF routes"
```

---

### Task 5: Add server-side authorization to Next.js pages

**Files:**
- Modify: `apps/platform/src/app/(platform-auth)/` layout or page files
- Modify: `apps/web/src/app/admin/` layout or page files
- Modify: `apps/web/src/app/account/page.tsx`

- [ ] **Step 1: Create a server-side auth check utility**

Create `apps/platform/src/lib/auth/server-auth.ts`:

```typescript
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionSigningSecret } from './boundary/config';
// Import whatever cookie-reading/decoding utility already exists in boundary/
import { decodeSessionCookie } from './boundary/cookies'; // adjust to actual function name

export async function requirePlatformAdmin(): Promise<{ adminId: string; email: string }> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__Secure-sneakereco_platform_session')?.value;
  
  if (!sessionCookie) {
    redirect('/login');
  }

  try {
    const session = await decodeSessionCookie(sessionCookie, getSessionSigningSecret());
    if (!session || session.actorType !== 'platform_admin') {
      redirect('/login');
    }
    return session;
  } catch {
    redirect('/login');
  }
}
```

Create the equivalent for `apps/web/src/lib/auth/server-auth.ts` covering `requireTenantAdmin()` and `requireCustomer()`.

- [ ] **Step 2: Apply `requirePlatformAdmin()` to platform admin pages**

In `apps/platform/src/app/(platform-auth)/` — add the auth check to any page or layout that should be protected:

```typescript
// apps/platform/src/app/page.tsx (dashboard home — protected)
import { requirePlatformAdmin } from '../lib/auth/server-auth';

export default async function DashboardPage() {
  await requirePlatformAdmin(); // redirects to /login if not authenticated
  // ... render dashboard
}
```

- [ ] **Step 3: Apply `requireTenantAdmin()` to tenant admin pages**

In `apps/web/src/app/admin/` pages and `apps/web/src/app/admin/web-design/`:

```typescript
import { requireTenantAdmin } from '../../lib/auth/server-auth';

export default async function AdminPage() {
  await requireTenantAdmin();
  // ...
}
```

- [ ] **Step 4: Apply `requireCustomer()` to customer account pages**

In `apps/web/src/app/account/page.tsx`.

- [ ] **Step 5: Test auth redirects manually**

Start the web dev server:
```bash
cd apps/web && pnpm dev
```

Navigate to `/admin` without a session cookie. Expected: redirect to `/admin/login`.
Navigate to `/account` without a session cookie. Expected: redirect to `/login`.

- [ ] **Step 6: Commit**

```bash
git add apps/platform/src/lib/auth/server-auth.ts
git add apps/web/src/lib/auth/server-auth.ts
git add apps/platform/src/app/
git add apps/web/src/app/admin/
git add apps/web/src/app/account/
git commit -m "feat: add server-side auth enforcement on admin and account pages"
```

---

### Task 6: Align NestJS CORS to the trusted domain model

**Files:**
- Modify: `apps/api/src/core/security/cors-origin-policy.ts`
- Modify: `apps/api/src/core/security/security.service.ts`

- [ ] **Step 1: Read the current CORS origin validator**

```bash
cat apps/api/src/core/security/cors-origin-policy.ts
cat apps/api/src/core/security/security.service.ts
```

Identify what origins are currently allowed and whether reflected origins are possible.

- [ ] **Step 2: Replace any wildcard or reflected origin patterns**

The CORS validator must:
1. Allow platform dashboard: `https://dashboard.sneakereco.com`
2. Allow known tenant subdomains: verified via `TrustedHostService.classify()` — only `tenant-storefront` type allowed
3. Allow custom domains: verified via `TenantDomainConfigRepository.findByCustomDomain()` — only `ready` status allowed
4. Reject everything else

Update `cors-origin-policy.ts` to use `TrustedHostService` for the static classification and the dynamic custom-domain lookup:

```typescript
import { TrustedHostService } from './trusted-host.service';

export function createCorsOriginValidator(
  trustedHostService: TrustedHostService,
  isKnownCustomDomain: (host: string) => Promise<boolean>,
) {
  return async (origin: string, callback: (err: Error | null, allow: boolean) => void) => {
    if (!origin) { callback(null, false); return; }

    let host: string;
    try {
      host = new URL(origin).hostname;
    } catch {
      callback(null, false);
      return;
    }

    const classification = trustedHostService.classify(host);

    if (classification.type === 'platform' || classification.type === 'tenant-storefront') {
      callback(null, true);
      return;
    }

    if (classification.customDomain) {
      const known = await isKnownCustomDomain(host);
      callback(null, known);
      return;
    }

    callback(null, false);
  };
}
```

- [ ] **Step 3: Inject `TrustedHostService` into the CORS validator in `main.ts`**

In `apps/api/src/main.ts`, ensure the CORS validator receives `TrustedHostService` (it already receives `SecurityService` and `TenantDomainConfigRepository` — add `TrustedHostService`):

```typescript
const trustedHostService = app.get(TrustedHostService);
await app.register(fastifyCors, {
  ...securityService.getCorsOptions(),
  origin: createCorsOriginValidator(
    trustedHostService,
    async (host) => (await tenantDomainConfigRepository.findByCustomDomain(host)) !== null,
  ),
});
```

- [ ] **Step 4: Test CORS with a disallowed origin**

Start the API:
```bash
cd apps/api && pnpm start:dev
```

```bash
curl -s -H "Origin: https://evil.example.com" http://localhost:3000/auth/customer/login \
  -X OPTIONS -i | grep -i "access-control"
```

Expected: no `Access-Control-Allow-Origin` header in response (origin rejected).

```bash
curl -s -H "Origin: https://kicks.sneakereco.com" http://localhost:3000/auth/customer/login \
  -X OPTIONS -i | grep -i "access-control"
```

Expected: `Access-Control-Allow-Origin: https://kicks.sneakereco.com`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/core/security/cors-origin-policy.ts
git add apps/api/src/core/security/security.service.ts
git add apps/api/src/main.ts
git commit -m "feat(api): align CORS to trusted host model — reject reflected/unknown origins"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run full build**

```bash
pnpm build
```

Expected: all packages succeed.

- [ ] **Step 2: Run API tests**

```bash
cd apps/api && pnpm test
```

Expected: all tests pass including new `trusted-host.service` and `tenant-resolution.service` tests.

- [ ] **Step 3: Manual smoke test**

Start platform and web apps in dev mode. Verify:
- Visiting `/` on platform without a session → redirects to `/login`
- Visiting `/admin` on web without a session → redirects to `/admin/login`
- BFF POST to `/api/auth/login` without CSRF token → `403 FORBIDDEN`
- BFF POST to `/api/auth/login` with valid CSRF token and correct origin → passes through

- [ ] **Step 4: Update master index**

Mark Plan 3 as `Complete` in `docs/superpowers/plans/2026-05-01-00-remediation-master-index.md`.
