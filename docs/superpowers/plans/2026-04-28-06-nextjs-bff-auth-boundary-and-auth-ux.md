# Next.js BFF Auth Boundary And Auth UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the browser-facing BFF auth layer and the initial customer/admin auth experiences in the Next.js apps using the locked design families and same-site cookie boundary.

**Architecture:** The browser talks to same-origin route handlers first. Those route handlers proxy to the Nest API, manage secure refresh cookies at the active domain, and render auth pages from the versioned customization system.

**Tech Stack:** Next.js App Router, Tailwind CSS, Route Handlers, TypeScript

---

## File Structure

**Create:**
- `apps/web/src/app/(tenant-auth)/*`
- `apps/web/src/app/api/auth/*`
- `apps/web/src/lib/auth/*`
- `apps/platform/src/app/(platform-auth)/*`
- `apps/platform/src/app/api/auth/*`

## Tasks

- [ ] Build same-origin BFF login, refresh, logout, and setup route handlers for tenant and platform surfaces.
- [ ] Set BFF-managed secure cookies using the locked cookie policy.
- [ ] Keep access tokens in memory client-side only.
- [ ] Render the initial auth families:
  - Family A: minimal editorial light
  - Family B: bold split dark
- [ ] Implement customer routes for login, register, verify-email, forgot-password, reset-password, OTP, and MFA.
- [ ] Implement tenant admin routes for login, setup, and MFA.
- [ ] Implement platform admin routes for login and MFA.
- [ ] Add stateful auth previews using fixtures from the customization system.
- [ ] Ensure the admin dashboard shell follows the locked reference direction while staying structurally platform-controlled.

## Verification

- [ ] Manual test tenant subdomain login flow.
- [ ] Manual test custom-domain-safe same-origin refresh behavior.
- [ ] Manual test platform admin login flow.
- [ ] Visual test both initial auth families across desktop, tablet, and mobile preview modes.
