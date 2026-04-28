# Auth Email Rendering And Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the auth email system with design-family pairing, stateful previews, sender identity resolution, test sends, and SMTP/SES delivery.

**Architecture:** Keep email rendering as a structured bounded system parallel to auth pages. Separate selection, rendering, sender identity resolution, and delivery transport.

**Tech Stack:** NestJS, SES or SMTP, Mailpit, TypeScript

---

## File Structure

**Create:**
- `apps/api/src/core/email/*`
- `apps/api/src/modules/communications/*`
- `apps/api/src/workers/email/*`

## Tasks

- [ ] Add email template registry and versioned tenant email config resources.
- [ ] Implement design-family mapping between auth pages and auth emails.
- [ ] Implement the first two email families:
  - minimal editorial light
  - bold dark branded
- [ ] Add stateful preview fixture rendering for verification, OTP, reset, invitation, and fallback-branding cases.
- [ ] Add test-send APIs with policy checks.
- [ ] Add sender identity resolution by tenant, purpose, environment, and readiness state.
- [ ] Support SneakerEco-managed subdomain identities first and tenant-owned identities later.
- [ ] Deliver via SMTP to Mailpit in local and SES-backed sending in production.
- [ ] Emit email audit records and relevant failure events.

## Verification

- [ ] Preview all auth email types with fixture data.
- [ ] Send local test emails to Mailpit.
- [ ] Validate fallback sender behavior when tenant custom sender is not ready.
