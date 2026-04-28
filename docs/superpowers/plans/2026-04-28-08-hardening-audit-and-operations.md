# Hardening, Audit, And Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the full auth/platform system for production operation with final policy enforcement, rate limits, audit coverage, dead-letter handling, metrics, and operational recovery tooling.

**Architecture:** Treat operational quality as part of the system design, not a cleanup pass. Turn the earlier functional work into a production-safe platform with explicit auditability and recovery paths.

**Tech Stack:** NestJS, Valkey, BullMQ, PostgreSQL, TypeScript

---

## File Structure

**Create:**
- `apps/api/src/modules/audit/*`
- `apps/api/src/core/observability/metrics/*`
- `apps/api/src/core/observability/health/indicators/*`
- `tooling/ops/*` or equivalent CLI scripts for internal recovery

## Tasks

- [ ] Finalize rate-limit policies per route class.
- [ ] Add suspicious-auth telemetry hooks and structured signals.
- [ ] Add dead-letter inspection and replay tooling for internal operators.
- [ ] Add audit retrieval APIs for platform and tenant admin use cases where appropriate.
- [ ] Add metrics for auth failure rate, provisioning failures, email failures, backlog sizes, and worker health.
- [ ] Add final health indicators and startup readiness checks.
- [ ] Add CLI/internal workflows for replaying provisioning and delivery failures safely.
- [ ] Add final documentation for recovery, revocation, tenant-domain cutover, and release rollback operations.

## Verification

- [ ] Simulate queue failures and verify dead-letter capture.
- [ ] Simulate provisioning replay through internal tooling.
- [ ] Confirm audit events exist for every required family from the spec.
- [ ] Confirm metrics and health checks surface failures clearly.
