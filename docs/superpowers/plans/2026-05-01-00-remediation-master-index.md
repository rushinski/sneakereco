# SneakerEco Remediation Master Index

> **For agentic workers:** Execute plans in the dependency order listed below. Each plan produces working, testable software independently. Do not start a plan until its listed dependencies are complete.

## Plan Sequence

| # | Plan | File | Depends On | Status |
|---|------|------|-----------|--------|
| 1 | Foundation Hardening | [2026-05-01-01-foundation-hardening.md](./2026-05-01-01-foundation-hardening.md) | — | Ready |
| 2 | Schema & RLS Alignment | [2026-05-01-02-schema-rls-alignment.md](./2026-05-01-02-schema-rls-alignment.md) | — | Ready (parallel-safe with 1) |
| 3 | Web Platform Security & Tenant Resolution | [2026-05-01-03-web-platform-security.md](./2026-05-01-03-web-platform-security.md) | 1 | After Plan 1 |
| 4 | Repository Layer → Drizzle | [2026-05-01-04-repository-layer-drizzle.md](./2026-05-01-04-repository-layer-drizzle.md) | 1, 2 | After Plans 1 + 2 |
| 5 | Auth Completion (MFA + Emails) | [2026-05-01-05-auth-completion.md](./2026-05-01-05-auth-completion.md) | 1, 4 | Complete |
| 6 | Module Structure Cleanup | [2026-05-01-06-module-structure-cleanup.md](./2026-05-01-06-module-structure-cleanup.md) | 1, 4 | After Plans 1 + 4 |

## What Each Plan Fixes

### Plan 1 — Foundation Hardening
- Build error: `SESSION_SIGNING_SECRET` throws at module-load time during Next.js build
- Missing `apps/api/src/common/` folder and standard error types
- Missing global exception filter (all errors return inconsistent shapes, no `request_id`)
- Missing global validation pipe (class-validator DTOs not enforced globally)
- Missing request logging interceptor (request IDs are captured but not logged per request)
- Direct `process.env` access in API services (should use `@Inject(ENVIRONMENT)`)

### Plan 2 — Schema & RLS Alignment
- Consumes: `docs/superpowers/specs/2026-04-30-schema-and-rls-alignment-design.md`
- Produces a table lifecycle matrix (active / transitional / deprecated / retire)
- Classifies every auth/platform table by ownership domain
- Audits RLS coverage across all exported tables
- Aligns actor model in RLS helpers to approved model (`platform_admin`, `tenant_admin`, `customer`, `system`, `worker`)
- Identifies deprecated tables (`users`, `tenant_members`, `tenant_onboarding`) so Plan 4 knows which Drizzle tables to target

### Plan 3 — Web Platform Security & Tenant Resolution
- Consumes: `docs/superpowers/specs/2026-04-30-web-platform-security-and-tenant-resolution-design.md`
- Replaces heuristic tenant derivation (`tnt_${slug}`) with lookup against `tenant_domain_configs`
- Defines trusted host model for platform, tenant subdomains, and custom domains
- Hardens all BFF route handlers (consistent cookie policy, CSRF, origin checking, cache headers, error normalization)
- Adds server-side authorization to Next.js pages (platform admin pages, tenant admin pages, customer account pages)
- Aligns NestJS CORS to the same trusted origin model

### Plan 4 — Repository Layer → Drizzle
- Removes all in-memory `Map` implementations from every repository
- Injects `DatabaseService` and runs real Drizzle queries against `packages/db` schema
- Covers all 20 repositories across auth, tenants, platform-onboarding, communications, web-builder, and core modules
- Wires outbox repository to write real event records

### Plan 5 — Auth Completion
- Adds missing MFA slices: `mfa/setup`, `mfa/verify-setup`, `mfa/enable`, `mfa/disable`
- Disables Cognito default email delivery (verification, OTP)
- Creates email template files as separate React Email components (not inline strings)
- Wires domain events from all auth slices to the `communications` module
- Ensures `customer_users` DB write occurs on confirm-email, not registration

### Plan 6 — Module Structure Cleanup
- Vertically slices `web-builder` module to match the rest of the codebase
- Removes `tenant-*` filename prefix redundancy inside `modules/tenants/`
- Wires outbox worker to actually dispatch domain events
- Ensures all cross-module side effects go through the outbox rather than direct service calls

## Architecture Decisions Locked Before Execution

These decisions are already locked by `docs/superpowers/specs/2026-04-28-auth-platform-architecture-design.md` and must not be relitigated during plan execution:

- Shared admin Cognito pool; per-tenant customer pools
- BFF-owned refresh cookies (first-party, same-origin)
- Database-backed sessions with cache revocation layer
- Durable outbox pattern for cross-module events
- `common/` folder for cross-cutting NestJS infrastructure
- Symbol-based config injection (`@Inject(ENVIRONMENT)`) — not `@nestjs/config ConfigService`
- Fastify adapter (not Express)
- Drizzle ORM (not TypeORM, Prisma, etc.)
