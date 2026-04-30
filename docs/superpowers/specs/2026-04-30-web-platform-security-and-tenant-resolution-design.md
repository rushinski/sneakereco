# Web Platform Security And Tenant Resolution Design

## Purpose

This spec defines Stage 3 of the remediation effort: make the tenant web app and platform app trustworthy at the boundary where browser requests become authenticated application requests.

The current codebase has partial CSRF and header protections, but tenant identity, trusted host handling, BFF enforcement, and server-side authorization are not yet defined strongly enough to support a multi-tenant platform safely.

## Problem Statement

The current implementation has several boundary weaknesses:

- tenant identity is derived from host labels heuristically instead of resolved through a trusted model
- API and Next.js layers do not yet share a fully coherent trusted-origin and tenant-resolution contract
- some BFF routes point to the wrong backend actions
- page and route authorization is not yet consistently enforced server-side
- security behavior is distributed across files without one explicit trust model

In a multi-tenant system, these are not minor defects. Tenant resolution and browser-boundary enforcement are part of the security model itself.

## Goal

Establish a clear, auditable security boundary across:

- browser
- Next.js route handlers and server rendering
- Nest API
- tenant and platform domain resolution

After this stage:

- tenant and platform requests are resolved through explicit trusted rules
- auth/session route handlers enforce consistent server-side policy
- no sensitive auth flow depends on guessed tenant identity
- the boundary between browser, BFF, and API is documented and enforceable

## Non-Goals

Out of scope:

- full schema and RLS completion
- repository-wide slice redesign
- speculative edge or CDN routing redesign beyond the current deployment assumptions
- forcing all application traffic through BFF when direct app-to-API calls are more appropriate

## Trust Model

### Trusted domains

The system must explicitly recognize and distinguish:

- platform domain
- platform admin domain
- tenant subdomains
- tenant admin subdomains
- tenant custom storefront domains
- tenant custom admin domains

Requests must not be trusted merely because they contain a plausible host header.

### Host/header trust

The system must define which upstream headers are authoritative in each environment, including:

- `host`
- `x-forwarded-host`
- `x-forwarded-proto`
- `origin`

Resolution must account for reverse proxy deployment while still rejecting inconsistent or untrusted combinations.

### Tenant resolution

Tenant resolution must become a trusted lookup problem, not a string-concatenation shortcut.

The resolution model should:

- accept a request host
- determine whether it is platform or tenant scope
- resolve the host against trusted tenant domain configuration
- produce an explicit tenant context only after that lookup succeeds

Fallback fabricated tenant IDs such as `tnt_${slug}` should not remain part of the security-sensitive path.

## BFF Boundary Model

### What BFF is for

The BFF layer is mandatory for browser-bound auth and session flows because it:

- owns first-party refresh cookies
- hides direct browser handling of refresh tokens
- enforces same-origin mutation rules
- translates between browser-safe state and backend auth contracts

### What BFF is not for

The BFF is not automatically the right transport for every application endpoint. This spec should define when BFF is required versus when direct app-to-API interaction is acceptable.

Required BFF cases include:

- login
- logout
- refresh
- MFA challenge completion
- setup invitation/session flows
- session inspection endpoints where browser cookies are involved

### BFF enforcement rules

BFF route handlers must enforce:

- host/origin validation
- CSRF for cookie-backed state-changing flows
- secure cookie policy
- cache-control for auth/session responses
- server-side actor and tenant context propagation
- consistent error mapping

## Next.js Security Requirements

### Server-side authorization

Sensitive pages and route handlers must authorize on the server, not by relying on client navigation or hidden UI.

This applies to:

- platform admin pages
- tenant admin pages
- session inspection routes
- setup and MFA flows
- any route that mutates auth/session state

### Cookie rules

Cookie policy must be explicit for each auth/session cookie:

- `Secure`
- `HttpOnly` where appropriate
- correct `SameSite` behavior
- path scoping where beneficial
- predictable clearing behavior on logout and failed refresh

### CSRF and origin enforcement

CSRF should remain part of the BFF mutation boundary, but this spec must turn it into a coherent rule set rather than scattered helper behavior.

The system should define:

- when token-based CSRF is required
- when strict origin matching is required
- how platform and tenant domains differ
- how invalid origin or host mismatch is handled consistently

### Cache behavior

Auth/session endpoints and sensitive server-rendered pages must define cache behavior explicitly to avoid replaying stale session state or leaking tenant-sensitive responses.

### Secret handling

Next.js code must clearly separate:

- server-only secrets and signing keys
- browser-safe configuration
- server-only route handlers
- client-side auth state that may hold access tokens in memory only

## API Edge Requirements

The Nest API must agree with Next.js on:

- which origins are trusted
- how platform origins differ from tenant origins
- how tenant hostnames are resolved
- how actor context is normalized and enforced

The API should not accept reflected or opportunistically trusted tenant origin values.

## Workstreams

### Workstream A: Trusted host and domain model

Define the platform/tenant/custom-domain recognition rules and the lookup path that turns hostnames into trusted context.

### Workstream B: Tenant resolution model

Replace heuristic tenant derivation with a resolution flow backed by trusted configuration.

### Workstream C: BFF hardening

Define consistent route-handler policy for cookies, CSRF, origin checking, session handling, and error normalization.

### Workstream D: Server-side authorization model

Define how platform, tenant-admin, and customer pages and route handlers enforce authorization on the server.

## Success Criteria

This stage is successful when:

1. Tenant and platform requests are resolved through explicit trusted rules.
2. Sensitive auth flows do not depend on guessed tenant identity.
3. Auth/session route handlers enforce consistent server-side policy.
4. The browser, Next.js server, and Nest API boundary is explicit and auditable.
5. The security model is understandable enough to review without tracing scattered incidental logic.

## Risks

### Risk: Security rules remain fragmented

Mitigation:

- define one trust model and apply it consistently across web, platform, and API

### Risk: Overusing BFF

Mitigation:

- define when BFF is required and when it is not

### Risk: Tenant lookup remains heuristic in edge cases

Mitigation:

- require trusted host resolution against configuration instead of inferred IDs

## Handoff To Later Stages

This stage should leave the system with a trustworthy web/API boundary. Later schema and RLS work can then assume that tenant and actor context entering the backend is materially more reliable than it is today.
