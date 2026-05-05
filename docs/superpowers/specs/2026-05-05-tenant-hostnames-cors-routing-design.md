# Tenant Hostnames, Request Routing, and Fastify CORS Design

## Goal

Replace inferred host/origin resolution with an explicit hostname registry and make that registry the source of truth for:

- browser request targeting
- surface resolution
- canonical host redirects
- browser-origin CORS allow/deny decisions

This design also removes the current split between Fastify CORS registration and custom CORS middleware, and replaces `OriginResolverService` with a more narrowly-scoped request host resolver.

## Problems With Current Design

The current runtime behavior mixes several different responsibilities:

- request host parsing and tenant resolution
- origin classification for CORS
- canonical host behavior
- platform host allowlists from env
- tenant host inference from host shape and DB fields

This creates a few concrete problems:

- tenant identity is derived from different signals in different places
- host validity depends partly on code inference rather than explicit data
- CORS behavior is split between bootstrap and custom middleware
- `OriginResolverService` has become a catch-all for routing/origin concerns
- request middleware is coupled to inferred hostname patterns

The Fastify migration also exposed this split directly: Fastify CORS is currently configured in a deny-all mode while custom middleware still contains the actual policy logic.

## Desired End State

The end state is:

- one DB table contains every recognized browser hostname
- request targeting comes from exact hostname lookup
- CORS allow/deny comes from exact origin-hostname lookup
- canonical redirects are explicit data, not inferred rules
- request context is assembled from resolved host records
- Fastify CORS is the only CORS mechanism
- `OriginResolverService` is removed

## Source of Truth

`tenant_hostnames` becomes the single runtime source of truth for browser hostnames.

It replaces hostname/domain runtime authority currently spread across:

- inferred managed subdomain logic
- custom/admin domain lookup logic
- platform host env allowlists used as host validity checks
- host-shape parsing in request resolution

Platform hosts and tenant hosts both live in this table. Platform rows use `tenant_id = null`.

## Table Design

Table: `tenant_hostnames`

One row per recognized browser hostname.

Columns:

- `id`
- `tenant_id` nullable
- `hostname` text unique not null
- `surface` enum:
  - `platform`
  - `platform-admin`
  - `customer`
  - `store-admin`
- `host_kind` enum:
  - `platform`
  - `managed`
  - `admin-managed`
  - `custom`
  - `admin-custom`
  - `alias`
- `is_canonical` boolean not null default `false`
- `redirect_to_hostname` text nullable
- `status` enum:
  - `active`
  - `disabled`
  - `pending_verification`
- `created_at`
- `updated_at`

Storage rules:

- `hostname` is lowercase
- `hostname` contains host only, never protocol, path, or port
- platform rows must have `tenant_id = null`
- tenant rows must have `tenant_id != null`
- non-canonical alias rows normally have `redirect_to_hostname` set

Examples:

- `sneakereco.test` → `platform`, canonical
- `dashboard.sneakereco.test` → `platform-admin`, canonical
- `soleshead.sneakereco.test` → `customer`, canonical
- `admin.soleshead.sneakereco.test` → `store-admin`, canonical
- `soleshead.com` → `customer`, canonical
- `admin.soleshead.com` → `store-admin`, canonical
- `www.soleshead.com` → `customer`, alias, non-canonical, redirect to `soleshead.com`

## Request Routing Model

For browser traffic, tenant targeting comes from the request hostname only.

Flow:

1. Read `Host`
2. Normalize to lowercase hostname
3. Exact lookup in `tenant_hostnames`
4. If row exists and is active, use it to determine:
   - tenant
   - surface
   - canonical host
   - redirect target if non-canonical
5. Build `RequestCtx`
6. Auth later validates whether the caller is allowed on that resolved tenant/surface

This removes:

- subdomain-derived tenant inference
- runtime regex host ownership inference
- primary reliance on `X-Tenant-ID` for browser routing

## CORS Model

Fastify CORS becomes the only CORS implementation.

The CORS policy uses the incoming `Origin` header, not the request `Host`.

Flow:

1. Read `Origin`
2. Parse URL
3. Normalize origin hostname
4. Exact lookup in `tenant_hostnames`
5. Allow if a row exists and `status = active`
6. Echo the exact origin back
7. Return credential-enabled CORS headers

Important rules:

- CORS uses exact hostname lookup only
- CORS does not depend on inferred host patterns
- CORS does not require `is_canonical = true`
- alias hosts may still be valid browser origins if active
- canonical redirect behavior belongs to request routing, not CORS

This means a recognized alias host can be allowed by CORS even if application routing later redirects it to a canonical host.

## Request Host Resolver

The old `OriginResolverService` is replaced by:

- `common/routing/request-host-resolver.service.ts`

This service is intentionally narrower.

Responsibilities:

- normalize host
- normalize origin to hostname when needed for request-routing consumers
- perform cached hostname lookup through a dedicated repository
- return resolved host metadata for request-context assembly

It does not:

- decide CORS policy
- write CORS headers
- decide auth pools
- infer host ownership from regex/patterns

## Request Context Middleware

`request-context.middleware.ts` becomes orchestration only.

Responsibilities:

- read raw headers
- ask `RequestHostResolverService` to resolve the request host
- resolve auth pool from `tenantId + surface`
- populate `RequestCtx`

It should no longer:

- derive tenant identity from subdomain shape
- embed domain-resolution business rules
- contain platform/tenant host inference logic

## CORS Config File

Fastify CORS configuration moves to a dedicated file:

- `config/cors.config.ts`

Responsibilities:

- build Fastify CORS options
- parse and normalize `Origin`
- read `tenant_hostnames` directly through its own CORS-specific query path
- use caching
- enforce allow/deny decisions

This file becomes the single source of truth for CORS policy.

`main.ts` should only register the plugin with options from this file.

## Repositories and Types

Add:

- `common/routing/request-host.types.ts`
- `common/routing/request-host.repository.ts`
- `common/routing/request-host-resolver.service.ts`

Request-side repository:

- exact DB lookup by hostname
- no caching
- no normalization
- no CORS decisions

CORS should use its own query path, even though it reads the same table. This keeps concerns separate and avoids hidden coupling between request routing and CORS logic.

## Caching

Hostname lookups should be cached.

Two cache namespaces are used to preserve concern separation:

- request routing cache:
  - `request-host:${hostname}`
- CORS cache:
  - `cors-origin:${hostname}`

Both are cache-aside:

1. normalize hostname
2. read cache
3. fallback to DB
4. cache result, including misses for a short TTL

Initial TTL:

- 300 seconds

Cache invalidation happens on hostname writes:

- tenant host creation
- canonical redirect changes
- custom/admin domain attach or removal
- alias creation/removal
- status changes

## Write-Side Ownership

The read model requires disciplined writes.

The system should eventually have a write-side owner such as:

- `TenantHostnameService`

That service would own:

- platform hostname insertion
- managed hostname creation on tenant creation
- custom/admin hostname creation
- alias hostname creation
- canonical host switching
- hostname disable/delete flows
- cache invalidation

This design doc does not require implementing that service first, but the runtime model assumes hostname writes are explicit and table-driven.

## Platform Hosts

Platform browser hosts should also be represented in `tenant_hostnames`.

That keeps runtime host validity in one place.

Env values may still exist for deployment/bootstrap concerns, but runtime hostname validity for routing and CORS comes from the table.

## Data Migration Strategy

No backfill or compatibility layer is required.

This system does not need to preserve legacy tenant/domain data. Existing data is disposable test data only.

Therefore the implementation should use a direct cutover:

1. create `tenant_hostnames`
2. seed current platform/test hostnames
3. switch runtime reads
4. delete old code paths

Avoid:

- dual-read logic
- sync logic between old and new sources
- fallback to legacy domain resolution
- backfill scripts

## File Changes

Add:

- `apps/api/src/common/routing/request-host.types.ts`
- `apps/api/src/common/routing/request-host.repository.ts`
- `apps/api/src/common/routing/request-host-resolver.service.ts`
- `apps/api/src/config/cors.config.ts`

Change:

- `apps/api/src/main.ts`
- `apps/api/src/common/context/request-context.middleware.ts`
- `apps/api/src/app.module.ts`

Remove:

- `apps/api/src/common/services/origin-resolver.service.ts`
- `apps/api/src/common/middleware/cors.middleware.ts`

## Implementation Order

1. Create `tenant_hostnames`
2. Seed platform/test tenant host rows
3. Add request-host repository, types, and resolver
4. Add Fastify CORS config file with exact hostname lookup
5. Register Fastify CORS from config in `main.ts`
6. Remove custom CORS middleware
7. Switch request-context middleware to request-host resolver
8. Remove `OriginResolverService`
9. Remove old inferred request-host/domain runtime logic
10. Verify login, refresh, logout, CSRF, tenant admin, platform admin, and redirects

## Risks

Primary risks:

- missing seeded hostname rows causing requests to resolve as unknown
- incorrect canonical/redirect rows causing bad redirects
- stale cache if hostname writes do not invalidate correctly

These are manageable because the design is explicit and there is no legacy migration burden.

## Decision Summary

The accepted design is:

- table-first host registry
- platform and tenant hosts in the same table
- exact hostname lookup for request routing
- exact hostname lookup for CORS
- Fastify CORS only
- no custom CORS middleware
- no inferred host-pattern runtime resolution
- no backfill/compatibility path
- `OriginResolverService` replaced by `RequestHostResolverService`
