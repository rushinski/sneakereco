# SneakerEco Auth Platform Plan Index

This index lists the complete implementation-plan set for the auth/platform rebuild. These plans are intentionally written before implementation begins so the full system is sequenced and cross-checked up front.

## Plan Order

1. [Identity And Cognito Foundation](./2026-04-28-01-identity-and-cognito-foundation.md)
2. [NestJS Platform Foundation](./2026-04-28-02-nestjs-platform-foundation.md)
3. [Auth And Session Control](./2026-04-28-03-auth-and-session-control.md)
4. [Platform Onboarding And Tenant Provisioning](./2026-04-28-04-platform-onboarding-and-tenant-provisioning.md)
5. [Web Builder And Auth Page Contracts](./2026-04-28-05-web-builder-and-auth-page-contracts.md)
6. [Next.js BFF Auth Boundary And Auth UX](./2026-04-28-06-nextjs-bff-auth-boundary-and-auth-ux.md)
7. [Auth Email Rendering And Delivery](./2026-04-28-07-auth-email-rendering-and-delivery.md)
8. [Hardening, Audit, And Operations](./2026-04-28-08-hardening-audit-and-operations.md)

## Dependency Chain

- Plan 1 defines the identity schema, ULID prefixes, Cognito contract, and environment contract that all later plans depend on.
- Plan 2 creates the runtime shell for API, workers, config, database, cache, queue, observability, and Swagger.
- Plan 3 builds the actual auth/session engine on top of Plans 1 and 2.
- Plan 4 builds onboarding, approval, provisioning, invitation, and setup workflows on top of Plans 1 through 3.
- Plan 5 builds the versioned customization system that later powers auth pages and auth emails.
- Plan 6 builds browser-safe BFF auth and the first auth UX surfaces on top of Plans 1 through 5.
- Plan 7 builds the email-rendering and delivery system on top of Plans 1, 4, and 5.
- Plan 8 hardens and operationalizes the full system after the functional slices exist.

## Execution Rule

No implementation should begin until the plan set has been reviewed as a whole. During execution, each plan should be implemented in order unless a later plan task is explicitly marked as parallel-safe.
