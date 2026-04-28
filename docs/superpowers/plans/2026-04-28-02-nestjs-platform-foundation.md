# NestJS Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the production-grade NestJS runtime foundation using Fastify, validated config, database wiring, cache/queue separation, observability, health, and Swagger.

**Architecture:** Build a clean `core` runtime shell shared by the HTTP app and worker entrypoint. Keep infrastructure concerns out of feature modules and expose stable interfaces for later auth, onboarding, and customization work.

**Tech Stack:** NestJS, Fastify, Drizzle ORM, Valkey, BullMQ, Swagger/OpenAPI, TypeScript

---

## File Structure

**Create:**
- `apps/api/src/worker-main.ts`
- `apps/api/src/core/config/*`
- `apps/api/src/core/database/*`
- `apps/api/src/core/cache/*`
- `apps/api/src/core/queue/*`
- `apps/api/src/core/observability/*`
- `apps/api/src/core/security/*`
- `apps/api/src/core/events/*`

**Modify:**
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/package.json`
- `apps/api/nest-cli.json`

## Tasks

- [ ] Bootstrap Nest with Fastify only; remove any Express assumptions.
- [ ] Add `worker-main.ts` and separate module composition for worker-safe runtime startup.
- [ ] Build env validation using a single schema-driven config module.
- [ ] Add Drizzle connection/pool wiring in `core/database`.
- [ ] Add explicit `core/cache` and `core/queue` modules with separate abstractions over the same Valkey backing service.
- [ ] Add request ID and correlation ID propagation through middleware/interceptors.
- [ ] Add structured logging contract and logger service.
- [ ] Add health endpoints covering API, database, cache, queue, and worker heartbeat visibility.
- [ ] Add Swagger/OpenAPI bootstrap with environment gating.
- [ ] Add CSP/CORS/CSRF/rate-limit scaffolding modules without feature-specific policies yet.
- [ ] Add outbox persistence and dispatcher interfaces so later workflows have a stable side-effect boundary.

## Verification

- [ ] Start the HTTP app successfully with Fastify.
- [ ] Start the worker entrypoint successfully.
- [ ] Confirm Swagger serves in local/dev only when enabled.
- [ ] Confirm health endpoints reflect database/cache availability.
