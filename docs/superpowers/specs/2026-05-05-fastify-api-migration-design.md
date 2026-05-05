# Fastify API Migration Design

## Summary

This spec defines the migration of the NestJS API from the Express platform adapter to the Fastify platform adapter.

The goal is a Fastify-native API runtime, not a partial boot swap. The migration removes Express as the active HTTP adapter, replaces Express-specific middleware and typing assumptions, and preserves current API behavior where practical. Small behavior changes are acceptable when they simplify removal of Express-only dependencies, especially around cookies and CSRF enforcement.

## Goals

- Switch the Nest API bootstrap from Express to Fastify.
- Remove direct runtime dependence on `express` and `@nestjs/platform-express` from the API app.
- Replace Express-specific middleware, request, and response assumptions with Fastify-compatible or adapter-neutral patterns.
- Preserve existing auth, request-context, logging, CORS, and error-envelope behavior as closely as practical.
- Keep the resulting API typecheckable and testable without adapter mismatches.

## Non-Goals

- Broad auth-contract redesign beyond what is required to run correctly on Fastify.
- Web or platform frontend rewrites.
- Performance tuning beyond what naturally follows from the adapter migration.
- Refactoring unrelated API modules that are not coupled to Express.

## Current State

The API is currently Express-bound in two ways:

- Bootstrap and middleware wiring in `apps/api/src/main.ts` uses `NestExpressApplication`, Express body parsers, `app.set()`, and middleware registration patterns shaped around Express.
- Multiple modules import Express request and response types directly for filters, guards, interceptors, decorators, middleware, controllers, and CSRF helpers.

This means the migration must cover both platform setup and the application code that assumes Express request and response objects.

## Recommended Architecture

The API should run on `@nestjs/platform-fastify` with Fastify plugins registered explicitly during bootstrap. Application code should prefer Nest HTTP abstractions or narrow local interfaces instead of importing Express types directly.

Where request metadata is needed, code should read from Nest's HTTP context or from Fastify request/reply objects only at the edge. Where response mutation is needed, code should use reply/header/status/send semantics through Fastify-compatible access patterns.

This keeps Fastify as the true runtime while reducing future adapter lock-in.

## Migration Approach

### 1. Bootstrap and platform adapter

- Replace `NestExpressApplication` with `NestFastifyApplication`.
- Create the app with `FastifyAdapter`.
- Remove `express` body parser usage from bootstrap.
- Configure body size limits through Fastify or adapter options instead of `json()` and `urlencoded()`.
- Replace Express-specific `app.set('trust proxy', ...)` usage with Fastify-compatible trust proxy configuration.
- Keep `rawBody` enabled only if the Nest/Fastify path still supports the webhook/security flows that rely on it.

### 2. Fastify plugin registration

- Register Fastify-compatible cookie support in bootstrap.
- Replace custom Express CORS wiring with either Fastify CORS registration or a Fastify-compatible hook-based equivalent if the current allowlist logic must stay custom.
- Verify `helmet` usage is compatible with Fastify. If current middleware registration is not supported cleanly, use the Fastify plugin equivalent.

### 3. Request and response abstractions

- Remove direct `express` imports from middleware, filters, guards, interceptors, decorators, and controllers.
- Use Nest `ExecutionContext` and generic request extraction where possible.
- Use Fastify request/reply types only in places that truly need adapter-specific capabilities.
- Prefer reading headers, method, URL, hostname, cookies, and IP from a narrow local helper interface so downstream code is not coupled to the adapter.

### 4. Request-context and CORS flow

- Migrate `RequestContextMiddleware` and related request-ID/CORS behavior to Fastify-compatible middleware or hooks.
- Keep current origin and host resolution logic intact.
- Preserve `X-Request-ID` propagation and request-context population.
- Preserve current CORS decision rules, including special handling for public paths and `OPTIONS` requests.

### 5. Error handling and interceptors

- Update the global exception filter to write responses through Fastify reply handling rather than assuming Express `response.status().json()`.
- Update any interceptor or guard logic that assumes Express request shape.
- Preserve the current error envelope and logging behavior.

### 6. Cookies and CSRF

- Remove the Express-oriented `csrf-csrf` integration.
- Replace it with a Fastify-compatible cookie plus header validation approach that preserves the current double-submit contract shape as closely as practical.
- Preserve current cookie naming, cookie path, and secure-cookie policy unless a targeted compatibility change is required for Fastify.
- Controllers and helpers that currently read/write cookies through Express response helpers should move to Fastify reply methods or shared cookie helpers.

### 7. Dependency cleanup

- Replace `@nestjs/platform-express` with `@nestjs/platform-fastify`.
- Remove `express` and `@types/express` from the API package if no remaining code requires them.
- Add required Fastify packages such as the platform adapter and any cookie/CORS/helmet plugins needed by the final implementation.

## File-Level Design

### Bootstrap

- `apps/api/src/main.ts`
  - Switch to Fastify bootstrap.
  - Register Fastify plugins for cookies and any required security middleware.
  - Preserve global pipes, filters, interceptors, versioning, prefixing, Swagger, and logger setup.

### HTTP infrastructure

- `apps/api/src/common/context/request-context.middleware.ts`
- `apps/api/src/common/middleware/cors.middleware.ts`
- `apps/api/src/common/middleware/request-id.middleware.ts`
- `apps/api/src/common/filters/http-exception.filter.ts`

These files must stop depending on Express types and Express response mutation patterns.

### Auth and security

- `apps/api/src/core/security/csrf/csrf.service.ts`
- `apps/api/src/core/security/csrf/csrf.controller.ts`
- `apps/api/src/modules/auth/shared/tokens/auth-cookie.ts`
- Auth controllers that set cookies or depend on `Request`/`Response`

These files must move to Fastify-compatible cookie and CSRF handling.

### Cross-cutting request consumers

- Guards, decorators, and interceptors that type `Request` from Express

These should become adapter-neutral where possible, and Fastify-specific only where there is no clean framework-neutral access path.

### Package manifest

- `apps/api/package.json`

This file must be updated to reflect Fastify-native runtime dependencies and the removal of Express platform packages.

## Expected Behavior Changes

Small behavior adjustments are acceptable in these areas:

- CSRF implementation details may change as long as the API still enforces a cookie-plus-header anti-CSRF contract.
- Header ordering or exact low-level middleware execution order may differ under Fastify.
- Some request object details may normalize differently, provided current business logic still receives the required host, origin, method, path, and cookie inputs.

These changes are acceptable because the primary objective is a correct Fastify-native runtime, not bit-for-bit Express behavior preservation.

## Testing Requirements

Implementation must verify:

- API bootstrap runs on Fastify without adapter errors.
- Request-context population still resolves host, origin, tenant, and surface correctly.
- Request ID propagation still works.
- Custom CORS decisions still allow and deny the same request classes.
- Error responses still use the current envelope format.
- Cookie issuance and reading still work for auth flows.
- CSRF-protected routes still reject missing or invalid CSRF submissions.
- Existing unit and integration tests pass after adapter updates.
- API `typecheck` passes with Express types removed from active API code.

## Risks and Mitigations

### Risk: hidden Express coupling outside bootstrap

Mitigation:
- Search all API source files for Express imports and response-method assumptions.
- Update the migration based on actual usage rather than assuming the change is limited to `main.ts`.

### Risk: Fastify plugin behavior differs from Express middleware behavior

Mitigation:
- Keep custom logic in local hooks/helpers where exact behavior matters.
- Verify auth, cookies, and CORS flows with focused tests.

### Risk: CSRF library incompatibility

Mitigation:
- Replace the library integration rather than forcing Express compatibility layers into the Fastify runtime.
- Preserve the external contract rather than the exact internal package.

## Implementation Notes For Planning

- This migration should be planned as API-only work.
- Test-first work is required for any changed auth, cookie, CSRF, or middleware behavior.
- The first execution slice should focus on failing tests around bootstrap-sensitive and middleware-sensitive areas before modifying implementation.
- The migration should be completed in a single coherent pass rather than leaving the app half-Express and half-Fastify.

## Decision Summary

- The API will move to `@nestjs/platform-fastify`.
- Express is being removed as the active Nest platform adapter.
- Express-specific middleware and typing assumptions will be replaced, not shimmed long-term.
- CSRF and cookie handling may change internally to become Fastify-native.
- The target outcome is a complete Fastify-native Nest API, not a partial compatibility layer.
