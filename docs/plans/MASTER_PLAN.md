# SneakerEco Platform Rebuild — Master Execution Plan

> **Project Name:** SneakerEco (codebase prefix: `sneakereco`, pnpm scope: `@sneakereco/`)
>
> **Purpose:** This document is the single source of truth for rebuilding the SneakerEco multi-tenant sneaker resale marketplace. It is designed to be fed directly to an AI coding assistant (Claude Code, Cursor, etc.) for implementation. Every decision, file path, environment variable, and security requirement is specified with enough detail to execute without ambiguity.
>
> **Current State:** Single-tenant Next.js monolith on Supabase + Vercel (project internally known as "RDK" / realdealkickzsc). Messy codebase, no tests, broken checkout (Stripe closed), partially migrated to PayRilla.
>
> **Target State:** Multi-tenant SaaS platform with separate NestJS API + Next.js frontend, tenant self-service onboarding, per-tenant custom domains, automated SEO, and comprehensive testing. The platform lives at `sneakereco.com`. Each tenant gets `{slug}.sneakereco.com` or their own custom domain.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack Decisions](#2-technology-stack-decisions)
3. [Repository Structure](#3-repository-structure)
4. [Database Schema](#4-database-schema)
5. [Authentication System](#5-authentication-system)
6. [Multi-Tenant Architecture](#6-multi-tenant-architecture)
7. [Tenant Onboarding System](#7-tenant-onboarding-system)
8. [Automated SEO System](#8-automated-seo-system)
9. [Custom Domain System](#9-custom-domain-system)
10. [Frontend Theming & Customization](#10-frontend-theming--customization)
11. [Admin Dashboard](#11-admin-dashboard)
12. [Email System](#12-email-system)
13. [Payment Layer](#13-payment-layer)
14. [Fraud Detection](#14-fraud-detection)
15. [Tax & Nexus System](#15-tax--nexus-system)
16. [Shipping & Fulfillment](#16-shipping--fulfillment)
17. [Storage & CDN](#17-storage--cdn)
18. [Queue & Background Jobs](#18-queue--background-jobs)
19. [Caching Layer](#19-caching-layer)
20. [API Design](#20-api-design)
21. [Testing Strategy](#21-testing-strategy)
22. [CI/CD Pipelines](#22-cicd-pipelines)
23. [Infrastructure & Deployment](#23-infrastructure--deployment)
24. [Observability & Analytics](#24-observability--analytics)
25. [Security Posture](#25-security-posture)
26. [Environment Variables](#26-environment-variables)
27. [Local Development Setup](#27-local-development-setup)
28. [Migration Strategy](#28-migration-strategy)
29. [Execution Timeline](#29-execution-timeline)
30. [Items Previously Missing from This Plan](#30-items-previously-missing-from-this-plan)

---

## 1. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE                                │
│  DNS + CDN + DDoS Protection + Analytics + WAF                   │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ R2 (Storage) │  │ Workers KV       │  │ Web Analytics    │   │
│  │ Product imgs │  │ Tenant config    │  │ Per-domain       │   │
│  │ Attachments  │  │ Domain routing   │  │ traffic stats    │   │
│  └──────────────┘  └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│  Next.js Frontend│ │  NestJS API      │ │  Platform Site       │
│  (Coolify/DO)        │ │  (DO Droplet)    │ │  sneakereco.com      │
│                  │ │                  │ │  (Coolify/DO)            │
│  Per-tenant      │ │  REST API        │ │  Tenant onboarding   │
│  storefronts     │ │  Webhook handlers│ │  Marketing pages     │
│  Admin dashboards│ │  Background jobs │ │  Account requests    │
│  Custom domains  │ │  Queue consumers │ │                      │
└──────────────────┘ └──────────────────┘ └──────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│  DO Managed      │ │  DO Managed      │ │  AWS Services        │
│  PostgreSQL      │ │  Valkey (Redis)  │ │                      │
│                  │ │                  │ │  Cognito (Auth)      │
│  29 tables       │ │  Sessions        │ │  SES (Email)         │
│  RLS enforced    │ │  Rate limiting   │ │  SSM Param Store     │
│  Drizzle ORM     │ │  Job queues      │ │  (Tenant secrets)    │
│                  │ │  Cache layer     │ │                      │
└──────────────────┘ └──────────────────┘ └──────────────────────┘
                                            │
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                        ┌──────────┐  ┌──────────┐  ┌──────────┐
                        │ Doppler  │  │ PayRilla │  │ NoFraud  │
                        │ (Secrets)│  │ (Payment)│  │ (Fraud)  │
                        └──────────┘  └──────────┘  └──────────┘
```

### Request Flow

1. Customer visits `customdomain.com` or `storename.sneakereco.com`
2. Cloudflare DNS resolves → DO Droplet (frontend via Coolify) or DO Droplet (API)
3. Frontend determines tenant from hostname, fetches config
4. API middleware resolves tenant from `X-Tenant-ID` header or hostname
5. API sets PostgreSQL session variables for RLS enforcement
6. All queries automatically scoped to tenant

### System Boundaries

| System | Responsibility | Does NOT handle |
|--------|---------------|-----------------|
| Next.js Frontend | UI rendering, tenant theming, admin dashboard | Business logic, data validation |
| NestJS API | Business logic, data access, webhooks | UI rendering, static assets |
| Platform Site | Tenant onboarding, marketing | Storefront, admin |
| PostgreSQL | Data persistence, RLS enforcement | Caching, queuing |
| Valkey | Caching, rate limiting, job queues | Persistent data |
| Cloudflare | CDN, DNS, WAF, analytics, storage | Application logic |

---

## 2. Technology Stack Decisions

### Confirmed Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 15 (App Router) + TypeScript | Familiar, excellent DX, standalone Docker output, React Server Components |
| **Backend** | NestJS + TypeScript + Node.js | Structured architecture, DI, decorators, guards, interceptors, modules. Solves the "messy codebase" problem through enforced structure |
| **Database** | DigitalOcean Managed PostgreSQL 17 | Cost-effective ($15/mo starter), managed backups, connection pooling, trusted provider |
| **ORM** | Drizzle ORM | Type-safe, SQL-like syntax, excellent migration support, lightweight, generates types from schema |
| **Cache/Queue** | DigitalOcean Managed Valkey (Redis-compatible) | Sessions, rate limiting, BullMQ job queues, caching |
| **Auth** | AWS Cognito | See Section 5 for detailed rationale |
| **Storage** | Cloudflare R2 + Cloudflare CDN | S3-compatible, zero egress fees, global CDN included |
| **Email** | AWS SES | Already in use, per-tenant sender identities |
| **Secrets** | Doppler (app config) + AWS SSM Parameter Store (tenant secrets) | Doppler for env vars across environments; SSM for per-tenant PayRilla/Shippo credentials |
| **DNS/CDN** | Cloudflare | DNS, CDN, DDoS, WAF, Web Analytics, Workers KV for tenant routing |
| **Deployment (API)** | DigitalOcean Droplet (Ubuntu 24.04) | Colocates API + background workers, PM2 process manager, $24/mo (4GB/2vCPU) |
| **Deployment (Frontend)** | Coolify on DigitalOcean Droplet | Self-hosted PaaS, git-push deploy, preview URLs, auto SSL, ~$24/mo for a dedicated droplet. See rationale below. |
| **Deployment (Platform)** | Same Coolify instance | sneakereco.com marketing + onboarding, lightweight enough to share the frontend droplet |
| **Payment** | PayRilla (Accept.Blue white-label) | Already integrated, per-tenant merchant accounts |
| **Fraud** | NoFraud | Already integrated, chargeback guarantee on fraud |
| **Tax** | ZipTax + custom nexus tracking | Already integrated, free tier sufficient |
| **Shipping** | Shippo | Already integrated, per-tenant accounts |
| **Analytics** | Cloudflare Web Analytics | Free, privacy-friendly, works per-domain automatically when DNS is on Cloudflare |
| **Observability** | Grafana Cloud Free Tier | Logs (Loki), metrics (Prometheus), traces (Tempo), dashboards |
| **Speed Insights** | Sentry Performance / Web Vitals | Free tier, RUM-based Core Web Vitals, replaces Vercel Speed Insights |
| **API Contract** | OpenAPI 3.1 via @nestjs/swagger | Auto-generated from decorators, enforced in CI, typed client generation |
| **Monorepo** | Turborepo + pnpm | Shared types, efficient builds, workspace dependencies |
| **CI/CD** | GitHub Actions | Already in use, needs major overhaul |
| **Address Validation** | HERE Maps | Already integrated |

### Why NestJS over Hono

The previous plan called for Hono + Bun. After evaluating the codebase mess and the need for enforced structure, NestJS is the better choice:

1. **Enforced architecture**: Modules, controllers, services, guards, interceptors, pipes. You cannot build a messy codebase in NestJS without actively fighting the framework.
2. **Dependency injection**: No more manually wiring services. `@Injectable()` + constructor injection.
3. **Guards for auth**: `@UseGuards(TenantGuard, AdminGuard)` on any controller/route.
4. **Interceptors**: Audit logging, response transformation, error handling applied globally.
5. **Validation pipes**: Zod or class-validator on every DTO, enforced at the framework level.
6. **Excellent TypeScript support**: First-class decorators, metadata, reflection.
7. **Mature ecosystem**: Bull queues, Passport strategies, health checks, Swagger docs all as first-party modules.
8. **Node.js runtime**: No Bun compatibility issues with npm packages.

### Why Drizzle over Prisma/TypeORM

1. **SQL-like**: Reads like SQL, not an abstraction layer. Backend engineers think in SQL.
2. **Type-safe**: Full TypeScript inference from schema definitions.
3. **Lightweight**: No query engine binary, no code generation step.
4. **Migration control**: SQL migrations you can read and edit.
5. **Performance**: Generates efficient SQL, supports raw queries easily.
6. **RLS compatible**: Can execute `SET LOCAL` statements before queries.

### Why NOT Edge Config

At 7 sellers + 200K monthly users, edge config adds complexity without meaningful benefit. Tenant config will be cached in Valkey (sub-millisecond reads) and the API is colocated with the database. If/when you scale to 50+ tenants with global traffic, revisit edge config at that point.

### Why Coolify on DigitalOcean Instead of Vercel

Vercel's pricing scales aggressively once you leave the hobby/pro tier. At 200K monthly users across multiple tenant storefronts, the costs compound quickly through bandwidth overages ($40/100GB over 1TB), serverless function execution ($0.18/GB-hour over 1000 GB-hours), edge middleware invocations ($0.65/million over 1M), and image optimization ($5/1000 over 5000). A real-world multi-tenant storefront at this scale could easily hit $300-500/mo on Vercel.

**Coolify** is an open-source, self-hosted PaaS that gives you Vercel-like DX on your own infrastructure:

| Feature | Vercel | Coolify on DO Droplet |
|---------|--------|----------------------|
| Git-push deploy | Yes | Yes |
| Preview URLs per PR | Yes | Yes |
| Auto SSL (Let's Encrypt) | Yes | Yes |
| Custom domains | Yes | Yes (unlimited) |
| Cost at 200K MAU | ~$300-500/mo | ~$24/mo (droplet) |
| Bandwidth limits | 1TB included then $40/100GB | Unlimited (droplet) |
| Serverless function limits | Yes | No (runs as Node process) |
| CDN | Built-in edge network | Cloudflare CDN in front (free) |
| Lock-in risk | High (proprietary features) | None (standard Docker/Node) |

**Setup:** Next.js runs in `standalone` output mode inside a Docker container managed by Coolify. Cloudflare sits in front as the CDN, providing global edge caching for static assets, DDoS protection, and Web Analytics. The combination of Coolify + Cloudflare CDN gives you ~90% of Vercel's performance at ~10% of the cost.

**The tradeoff:** You lose Vercel's zero-config image optimization (use `next/image` with a self-hosted sharp loader or Cloudflare Image Resizing instead) and you take on some ops responsibility (Coolify handles most of it, but you own the server). At your scale and budget, this is the right tradeoff.

**Droplet spec for frontend:** 4GB RAM / 2 vCPU / 80GB SSD ($24/mo). Separate from the API droplet. Coolify manages both the storefront app and the platform site on this single droplet.

### Enforced API Contract: OpenAPI 3.1

**Yes, you should have an enforced API contract.** NestJS has first-party OpenAPI support via `@nestjs/swagger` that auto-generates an OpenAPI 3.1 spec from your controller decorators and DTOs. This is not optional overhead; it is a force multiplier:

**What it gives you:**
1. **Typed frontend client generation** -- Use `openapi-typescript` or `orval` to auto-generate a fully typed TypeScript API client from the spec. The frontend never hand-writes fetch calls or guesses response shapes.
2. **Contract validation in CI** -- The OpenAPI spec is exported as JSON during build. CI validates that the spec is valid and that breaking changes are detected (via `oasdiff` or `openapi-diff`).
3. **Interactive API docs** -- Scalar (modern replacement for Swagger UI) serves beautiful, interactive API docs at `/api/docs`. Useful for debugging, onboarding, and if you ever expose the API to third parties.
4. **Request/response validation** -- DTOs decorated with `@ApiProperty()` and validated with `class-validator` ensure the spec and the runtime validation are always in sync.
5. **AI coding assistant context** -- The OpenAPI spec can be fed to an AI coding assistant for accurate code generation against your actual API shape.

**Implementation approach: Code-first (not contract-first).** NestJS's Swagger plugin auto-infers most of the spec from your TypeScript types. You add `@ApiOperation()`, `@ApiResponse()`, and `@ApiProperty()` decorators for clarity. The spec is generated at build time and exported to `openapi.json`.

```typescript
// Example: products controller with OpenAPI decorators
@ApiTags('products')
@Controller('v1/admin/products')
@UseGuards(AuthGuard, AdminGuard)
export class ProductsController {
  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    return this.productsService.create(dto);
  }
}
```

**CI enforcement:**
```yaml
# In ci.yml
- name: Generate OpenAPI spec
  run: pnpm --filter @sneakereco/api openapi:generate

- name: Validate OpenAPI spec
  run: npx @redocly/cli lint apps/api/openapi.json

- name: Check for breaking changes
  run: npx oasdiff breaking apps/api/openapi.json apps/api/openapi.prev.json || true
```

### Queue System: BullMQ

BullMQ (backed by Valkey/Redis) handles:
- Order completion emails (deferred)
- Webhook processing (retry with backoff)
- Image processing (background removal, resizing)
- SEO metadata generation
- Shippo tracking event polling
- Scheduled cleanup jobs (expired tokens, abandoned orders)

NestJS has first-party BullMQ support via `@nestjs/bullmq`.

---

## 3. Repository Structure

### Monorepo Layout (Turborepo + pnpm)

```
sneakereco/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint + typecheck + test on every PR
│       ├── staging.yml               # Deploy to staging on merge to staging
│       ├── production.yml            # Deploy to production on version tag
│       └── db-migrate.yml            # Database migration workflow
├── packages/
│   ├── shared/                       # Shared TypeScript types & utilities
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types/
│   │       │   ├── tenant.ts         # Tenant, TenantConfig, TenantTheme
│   │       │   ├── user.ts           # User, TenantMember, UserRole
│   │       │   ├── product.ts        # Product, Variant, Category, Condition
│   │       │   ├── order.ts          # Order, OrderLineItem, OrderStatus
│   │       │   ├── payment.ts        # PaymentTransaction, PayrillaResult
│   │       │   ├── address.ts        # Address, OrderAddress, UserAddress
│   │       │   ├── shipping.ts       # ShippingConfig, TrackingEvent
│   │       │   ├── tax.ts            # TaxSettings, NexusRegistration
│   │       │   ├── seo.ts            # SEOConfig, MetaTags, StructuredData
│   │       │   ├── email.ts          # EmailTemplate, EmailAuditLog
│   │       │   ├── common.ts         # Pagination, ApiResponse, Money
│   │       │   └── index.ts
│   │       ├── constants/
│   │       │   ├── categories.ts     # Product categories
│   │       │   ├── conditions.ts     # Product conditions
│   │       │   ├── order-statuses.ts
│   │       │   ├── fulfillment.ts
│   │       │   ├── sizes.ts          # Shoe/clothing size constants
│   │       │   ├── nexus-thresholds.ts
│   │       │   └── index.ts
│   │       ├── utils/
│   │       │   ├── money.ts          # Cents ↔ dollars, formatting
│   │       │   ├── id.ts             # ULID generation with prefixes
│   │       │   ├── slug.ts           # URL-safe slug generation
│   │       │   ├── validation.ts     # Email, phone, zip validators
│   │       │   └── index.ts
│   │       └── index.ts
│   └── db/                           # Drizzle schema + migrations
│       ├── package.json
│       ├── drizzle.config.ts
│       ├── src/
│       │   ├── schema/
│       │   │   ├── tenants.ts
│       │   │   ├── users.ts
│       │   │   ├── tenant-members.ts
│       │   │   ├── products.ts
│       │   │   ├── product-variants.ts
│       │   │   ├── product-images.ts
│       │   │   ├── product-filters.ts
│       │   │   ├── product-filter-entries.ts
│       │   │   ├── tag-brands.ts
│       │   │   ├── tag-models.ts
│       │   │   ├── tag-aliases.ts
│       │   │   ├── orders.ts
│       │   │   ├── order-line-items.ts
│       │   │   ├── order-addresses.ts
│       │   │   ├── order-access-tokens.ts
│       │   │   ├── payment-transactions.ts
│       │   │   ├── user-addresses.ts
│       │   │   ├── audit-events.ts
│       │   │   ├── webhook-events.ts
│       │   │   ├── chargeback-evidence.ts
│       │   │   ├── email-audit-log.ts
│       │   │   ├── email-subscribers.ts
│       │   │   ├── contact-messages.ts
│       │   │   ├── featured-items.ts
│       │   │   ├── nexus-registrations.ts
│       │   │   ├── state-sales-tracking.ts
│       │   │   ├── tenant-tax-settings.ts
│       │   │   ├── tenant-shipping-config.ts
│       │   │   ├── shipping-tracking-events.ts
│       │   │   ├── tenant-onboarding.ts      # NEW
│       │   │   ├── tenant-seo-config.ts       # NEW
│       │   │   ├── tenant-theme-config.ts     # NEW
│       │   │   ├── tenant-email-config.ts     # NEW
│       │   │   ├── tenant-domain-config.ts    # NEW
│       │   │   └── index.ts
│       │   ├── relations.ts
│       │   ├── enums.ts
│       │   └── index.ts
│       ├── migrations/               # Generated SQL migrations
│       ├── seed/
│       │   ├── development.ts        # Dev seed data
│       │   └── staging.ts            # Staging seed data
│       └── scripts/
│           ├── migrate.ts
│           ├── seed.ts
│           └── generate.ts
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── ecosystem.config.js       # PM2 config
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── tenant.decorator.ts       # @CurrentTenant()
│   │   │   │   │   ├── user.decorator.ts          # @CurrentUser()
│   │   │   │   │   ├── roles.decorator.ts         # @Roles('admin')
│   │   │   │   │   └── public.decorator.ts        # @Public() skip auth
│   │   │   │   ├── guards/
│   │   │   │   │   ├── auth.guard.ts              # Cognito JWT verification
│   │   │   │   │   ├── tenant.guard.ts            # Tenant resolution + RLS setup
│   │   │   │   │   ├── roles.guard.ts             # Role-based access
│   │   │   │   │   └── webhook.guard.ts           # HMAC signature verification
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── audit.interceptor.ts       # Auto audit logging
│   │   │   │   │   ├── transform.interceptor.ts   # Response envelope
│   │   │   │   │   └── timeout.interceptor.ts     # Request timeout
│   │   │   │   ├── pipes/
│   │   │   │   │   └── zod-validation.pipe.ts     # Zod schema validation
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts   # Global error handling
│   │   │   │   ├── middleware/
│   │   │   │   │   ├── request-id.middleware.ts    # X-Request-ID
│   │   │   │   │   ├── cors.middleware.ts
│   │   │   │   │   └── rate-limit.middleware.ts
│   │   │   │   └── database/
│   │   │   │       ├── database.module.ts         # Drizzle + connection pool
│   │   │   │       ├── database.service.ts        # Transaction support
│   │   │   │       └── tenant-context.service.ts  # SET LOCAL for RLS
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── cognito.service.ts         # AWS Cognito SDK wrapper
│   │   │   │   │   ├── jwt.strategy.ts            # Passport JWT strategy
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── sign-up.dto.ts
│   │   │   │   │       ├── sign-in.dto.ts
│   │   │   │   │       └── reset-password.dto.ts
│   │   │   │   ├── tenants/
│   │   │   │   │   ├── tenants.module.ts
│   │   │   │   │   ├── tenants.controller.ts
│   │   │   │   │   ├── tenants.service.ts
│   │   │   │   │   ├── tenants.repository.ts
│   │   │   │   │   ├── onboarding/
│   │   │   │   │   │   ├── onboarding.controller.ts
│   │   │   │   │   │   ├── onboarding.service.ts
│   │   │   │   │   │   └── dto/
│   │   │   │   │   ├── domains/
│   │   │   │   │   │   ├── domains.controller.ts
│   │   │   │   │   │   ├── domains.service.ts
│   │   │   │   │   │   └── cloudflare.service.ts  # Cloudflare API for DNS
│   │   │   │   │   ├── theme/
│   │   │   │   │   │   ├── theme.controller.ts
│   │   │   │   │   │   └── theme.service.ts
│   │   │   │   │   └── seo/
│   │   │   │   │       ├── seo.controller.ts
│   │   │   │   │       └── seo.service.ts
│   │   │   │   ├── products/
│   │   │   │   │   ├── products.module.ts
│   │   │   │   │   ├── products.controller.ts     # Admin CRUD
│   │   │   │   │   ├── products.service.ts
│   │   │   │   │   ├── products.repository.ts
│   │   │   │   │   ├── storefront.controller.ts   # Public storefront queries
│   │   │   │   │   ├── storefront.service.ts
│   │   │   │   │   ├── images/
│   │   │   │   │   │   ├── images.controller.ts
│   │   │   │   │   │   └── images.service.ts
│   │   │   │   │   ├── filters/
│   │   │   │   │   │   ├── filters.service.ts
│   │   │   │   │   │   └── filters.repository.ts
│   │   │   │   │   ├── catalog/
│   │   │   │   │   │   ├── catalog.controller.ts
│   │   │   │   │   │   ├── catalog.service.ts
│   │   │   │   │   │   └── catalog.repository.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── orders/
│   │   │   │   │   ├── orders.module.ts
│   │   │   │   │   ├── orders.controller.ts
│   │   │   │   │   ├── orders.service.ts
│   │   │   │   │   ├── orders.repository.ts
│   │   │   │   │   ├── checkout/
│   │   │   │   │   │   ├── checkout.controller.ts
│   │   │   │   │   │   ├── checkout.service.ts    # Pricing + order creation
│   │   │   │   │   │   └── pricing.service.ts     # Subtotal/shipping/tax calc
│   │   │   │   │   ├── fulfillment/
│   │   │   │   │   │   ├── fulfillment.controller.ts
│   │   │   │   │   │   └── fulfillment.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── payments/
│   │   │   │   │   ├── payments.module.ts
│   │   │   │   │   ├── payrilla.service.ts        # PayRilla API wrapper
│   │   │   │   │   ├── payrilla-webhook.controller.ts
│   │   │   │   │   ├── payment-transactions.repository.ts
│   │   │   │   │   └── wallet/
│   │   │   │   │       ├── apple-pay.service.ts
│   │   │   │   │       └── google-pay.service.ts
│   │   │   │   ├── fraud/
│   │   │   │   │   ├── fraud.module.ts
│   │   │   │   │   ├── nofraud.service.ts
│   │   │   │   │   └── evidence.service.ts
│   │   │   │   ├── tax/
│   │   │   │   │   ├── tax.module.ts
│   │   │   │   │   ├── tax.service.ts             # ZipTax integration
│   │   │   │   │   ├── nexus.service.ts
│   │   │   │   │   ├── nexus.repository.ts
│   │   │   │   │   └── tax-settings.repository.ts
│   │   │   │   ├── shipping/
│   │   │   │   │   ├── shipping.module.ts
│   │   │   │   │   ├── shippo.service.ts
│   │   │   │   │   ├── shipping-config.service.ts
│   │   │   │   │   ├── tracking.service.ts
│   │   │   │   │   └── shippo-webhook.controller.ts
│   │   │   │   ├── customers/
│   │   │   │   │   ├── customers.module.ts
│   │   │   │   │   ├── customers.controller.ts    # Admin customer views
│   │   │   │   │   └── customers.service.ts       # Aggregates from orders/payments
│   │   │   │   ├── communications/
│   │   │   │   │   ├── communications.module.ts
│   │   │   │   │   ├── email/
│   │   │   │   │   │   ├── email.service.ts       # SES wrapper
│   │   │   │   │   │   ├── email-template.service.ts
│   │   │   │   │   │   └── templates/
│   │   │   │   │   │       ├── order-confirmation.ts
│   │   │   │   │   │       ├── shipping-update.ts
│   │   │   │   │   │       ├── pickup-instructions.ts
│   │   │   │   │   │       ├── refund-notification.ts
│   │   │   │   │   │       └── admin-order-placed.ts
│   │   │   │   │   ├── contact/
│   │   │   │   │   │   ├── contact.controller.ts
│   │   │   │   │   │   └── contact.service.ts
│   │   │   │   │   └── subscribers/
│   │   │   │   │       ├── subscribers.controller.ts
│   │   │   │   │       └── subscribers.service.ts
│   │   │   │   ├── addresses/
│   │   │   │   │   ├── addresses.module.ts
│   │   │   │   │   ├── addresses.controller.ts
│   │   │   │   │   ├── addresses.service.ts
│   │   │   │   │   └── here-maps.service.ts
│   │   │   │   ├── featured/
│   │   │   │   │   ├── featured.module.ts
│   │   │   │   │   ├── featured.controller.ts
│   │   │   │   │   └── featured.service.ts
│   │   │   │   ├── platform/                      # Platform-level endpoints (sneakereco.com)
│   │   │   │   │   ├── platform.module.ts
│   │   │   │   │   ├── platform.controller.ts     # Tenant request/invite endpoints
│   │   │   │   │   └── platform.service.ts
│   │   │   │   └── health/
│   │   │   │       ├── health.module.ts
│   │   │   │       └── health.controller.ts
│   │   │   └── jobs/                              # BullMQ job processors
│   │   │       ├── jobs.module.ts
│   │   │       ├── email.processor.ts
│   │   │       ├── image.processor.ts
│   │   │       ├── seo.processor.ts
│   │   │       ├── webhook.processor.ts
│   │   │       └── cleanup.processor.ts
│   │   └── test/
│   │       ├── jest.config.ts
│   │       ├── setup.ts
│   │       ├── factories/                 # Test data factories
│   │       │   ├── tenant.factory.ts
│   │       │   ├── user.factory.ts
│   │       │   ├── product.factory.ts
│   │       │   └── order.factory.ts
│   │       ├── unit/                      # Unit tests (service logic)
│   │       ├── integration/               # Integration tests (DB + service)
│   │       └── e2e/                       # End-to-end API tests
│   ├── web/                              # Next.js Frontend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx            # Root layout with tenant provider
│   │   │   │   ├── (storefront)/         # Customer-facing pages
│   │   │   │   │   ├── page.tsx          # Homepage
│   │   │   │   │   ├── shop/
│   │   │   │   │   ├── product/[id]/
│   │   │   │   │   ├── cart/
│   │   │   │   │   ├── checkout/
│   │   │   │   │   ├── order-status/[id]/
│   │   │   │   │   ├── about/
│   │   │   │   │   ├── contact/
│   │   │   │   │   └── auth/
│   │   │   │   │       ├── login/
│   │   │   │   │       ├── register/
│   │   │   │   │       └── forgot-password/
│   │   │   │   └── admin/                # Admin dashboard (admin.domain.com)
│   │   │   │       ├── layout.tsx
│   │   │   │       ├── page.tsx          # Dashboard overview
│   │   │   │       ├── orders/
│   │   │   │       ├── products/
│   │   │   │       ├── customers/
│   │   │   │       ├── shipping/
│   │   │   │       ├── tax/
│   │   │   │       ├── settings/
│   │   │   │       │   ├── general/
│   │   │   │       │   ├── domain/
│   │   │   │       │   ├── theme/
│   │   │   │       │   ├── email/
│   │   │   │       │   ├── seo/
│   │   │   │       │   ├── payments/
│   │   │   │       │   └── integrations/
│   │   │   │       ├── featured/
│   │   │   │       └── email-audit/
│   │   │   ├── components/
│   │   │   │   ├── ui/                   # Shadcn/ui components
│   │   │   │   ├── storefront/
│   │   │   │   │   ├── headers/          # Multiple header variants
│   │   │   │   │   │   ├── HeaderClassic.tsx
│   │   │   │   │   │   ├── HeaderMinimal.tsx
│   │   │   │   │   │   └── HeaderCentered.tsx
│   │   │   │   │   ├── heroes/           # Multiple hero variants
│   │   │   │   │   │   ├── HeroFullWidth.tsx
│   │   │   │   │   │   ├── HeroSplit.tsx
│   │   │   │   │   │   └── HeroSlider.tsx
│   │   │   │   │   ├── product-cards/
│   │   │   │   │   ├── filters/
│   │   │   │   │   └── footers/
│   │   │   │   ├── admin/
│   │   │   │   ├── checkout/
│   │   │   │   └── shared/
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts         # Typed API client (fetch wrapper)
│   │   │   │   ├── tenant-context.tsx    # React context for tenant config
│   │   │   │   ├── auth-context.tsx      # Cognito auth state
│   │   │   │   └── theme.ts             # CSS variable injection from tenant config
│   │   │   ├── hooks/
│   │   │   └── middleware.ts             # Next.js middleware for tenant routing
│   │   └── test/
│   │       ├── e2e/                      # Playwright E2E tests
│   │       └── component/               # Component tests
│   └── platform/                         # sneakereco.com marketing + onboarding
│       ├── package.json
│       ├── src/
│       │   └── app/
│       │       ├── page.tsx              # Landing page
│       │       ├── onboard/             # Tenant onboarding flow
│       │       ├── request/             # Account request form
│       │       └── invite/[token]/      # Direct invite acceptance
│       └── ...
├── tooling/
│   ├── eslint-config/
│   ├── tsconfig/
│   └── prettier-config/
├── docker/
│   ├── docker-compose.yml              # Local dev: Postgres + Valkey
│   └── docker-compose.test.yml         # CI: Postgres + Valkey for tests
├── .env.example
├── .gitignore
└── README.md
```

---

## 4. Database Schema

### Source of Truth

The database schema is defined in the uploaded `rdk-schema-rebuild-proposal-v2.md`. That document specifies 29 tables with prefixed ULIDs, all-cents money storage, and standardized naming. The following tables are ADDITIONS required for the new multi-tenant features described in this plan.

### New Tables (additions to the 29-table schema)

#### 4.1 `tenant_onboarding`

Tracks onboarding progress for each tenant. Each step must be completed before the store goes live.

```sql
CREATE TABLE tenant_onboarding (
    id                  TEXT PRIMARY KEY,           -- tob_<ULID>
    tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,

    -- Request/Invite tracking
    request_status      TEXT NOT NULL DEFAULT 'pending'
                        CHECK (request_status IN ('pending', 'approved', 'rejected', 'invited')),
    invite_token_hash   TEXT,
    invite_sent_at      TIMESTAMPTZ,
    invite_accepted_at  TIMESTAMPTZ,
    requested_by_email  TEXT,
    requested_by_name   TEXT,
    requested_by_phone  TEXT,
    business_name       TEXT,
    instagram_url       TEXT,
    request_notes       TEXT,                       -- Additional info from applicant

    -- Onboarding steps completion
    seo_questionnaire_completed    BOOLEAN NOT NULL DEFAULT FALSE,
    payment_integration_completed  BOOLEAN NOT NULL DEFAULT FALSE,
    shipping_integration_completed BOOLEAN NOT NULL DEFAULT FALSE,
    domain_configured              BOOLEAN NOT NULL DEFAULT FALSE,
    theme_configured               BOOLEAN NOT NULL DEFAULT FALSE,

    -- SEO questionnaire answers (JSONB)
    seo_answers         JSONB NOT NULL DEFAULT '{}',

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenant_onboarding_status ON tenant_onboarding (request_status);
CREATE INDEX idx_tenant_onboarding_invite ON tenant_onboarding (invite_token_hash)
    WHERE invite_token_hash IS NOT NULL;
```

#### 4.2 `tenant_seo_config`

Stores SEO configuration derived from the onboarding questionnaire. Used to auto-generate meta tags, structured data, and sitemap configuration.

```sql
CREATE TABLE tenant_seo_config (
    id                      TEXT PRIMARY KEY,
    tenant_id               TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,

    -- Business identity
    business_description    TEXT,                   -- 1-2 sentence description
    target_audience         TEXT,                   -- e.g., "sneaker collectors ages 18-35"
    geographic_focus        TEXT,                   -- e.g., "United States", "East Coast"
    unique_selling_points   TEXT[],                 -- Array of USPs
    primary_keywords        TEXT[],                 -- Top keywords to target
    secondary_keywords      TEXT[],

    -- Social / Brand
    social_links            JSONB NOT NULL DEFAULT '{}',  -- {instagram, twitter, tiktok, facebook}
    logo_url                TEXT,
    favicon_url             TEXT,
    og_image_url            TEXT,                   -- Default Open Graph image

    -- Technical SEO
    google_site_verification TEXT,
    google_analytics_id     TEXT,                   -- GA4 measurement ID (optional)
    robots_txt_overrides    TEXT,                   -- Custom robots.txt rules

    -- Auto-generated templates (populated by SEO service)
    meta_title_template     TEXT NOT NULL DEFAULT '{{product_name}} | {{store_name}}',
    meta_description_template TEXT NOT NULL DEFAULT 'Shop {{product_name}} at {{store_name}}. {{business_description}}',
    collection_title_template TEXT NOT NULL DEFAULT '{{category}} | {{store_name}}',
    collection_description_template TEXT NOT NULL DEFAULT 'Browse our {{category}} collection. {{business_description}}',

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 4.3 `tenant_theme_config`

Stores per-tenant visual customization settings.

```sql
CREATE TABLE tenant_theme_config (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,

    -- Colors (hex values)
    color_primary       TEXT NOT NULL DEFAULT '#000000',
    color_secondary     TEXT NOT NULL DEFAULT '#666666',
    color_accent        TEXT NOT NULL DEFAULT '#2563EB',
    color_background    TEXT NOT NULL DEFAULT '#FFFFFF',
    color_surface       TEXT NOT NULL DEFAULT '#F9FAFB',
    color_text          TEXT NOT NULL DEFAULT '#111827',
    color_text_muted    TEXT NOT NULL DEFAULT '#6B7280',
    color_border        TEXT NOT NULL DEFAULT '#E5E7EB',
    color_error         TEXT NOT NULL DEFAULT '#EF4444',
    color_success       TEXT NOT NULL DEFAULT '#22C55E',

    -- Typography
    font_heading        TEXT NOT NULL DEFAULT 'Inter',
    font_body           TEXT NOT NULL DEFAULT 'Inter',
    font_mono           TEXT NOT NULL DEFAULT 'JetBrains Mono',

    -- Component selections (which variant to use)
    header_variant      TEXT NOT NULL DEFAULT 'classic'
                        CHECK (header_variant IN ('classic', 'minimal', 'centered')),
    hero_variant        TEXT NOT NULL DEFAULT 'full_width'
                        CHECK (hero_variant IN ('full_width', 'split', 'slider', 'none')),
    product_card_variant TEXT NOT NULL DEFAULT 'standard'
                        CHECK (product_card_variant IN ('standard', 'minimal', 'detailed')),
    footer_variant      TEXT NOT NULL DEFAULT 'standard'
                        CHECK (footer_variant IN ('standard', 'minimal', 'extended')),
    filter_variant      TEXT NOT NULL DEFAULT 'sidebar'
                        CHECK (filter_variant IN ('sidebar', 'top_bar', 'drawer')),

    -- Layout
    max_content_width   TEXT NOT NULL DEFAULT '1280px',
    border_radius       TEXT NOT NULL DEFAULT '8px',
    show_about_page     BOOLEAN NOT NULL DEFAULT TRUE,
    show_contact_page   BOOLEAN NOT NULL DEFAULT TRUE,

    -- Hero content
    hero_title          TEXT,
    hero_subtitle       TEXT,
    hero_image_url      TEXT,
    hero_cta_text       TEXT DEFAULT 'Shop Now',
    hero_cta_link       TEXT DEFAULT '/shop',

    -- About page content
    about_content       TEXT,                      -- Markdown or rich text
    about_image_url     TEXT,

    -- Branding
    logo_url            TEXT,
    logo_width          INTEGER DEFAULT 120,       -- pixels
    favicon_url         TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 4.4 `tenant_email_config`

Per-tenant email sender configuration.

```sql
CREATE TABLE tenant_email_config (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,

    -- Sender identity
    from_email          TEXT NOT NULL,              -- e.g., orders@businessname.com
    from_name           TEXT NOT NULL,              -- e.g., "BusinessName"
    reply_to_email      TEXT,                       -- e.g., support@businessname.com
    support_email       TEXT,                       -- Displayed in emails for help

    -- SES verification status
    ses_domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ses_domain          TEXT,                       -- The verified domain in SES

    -- Template preferences
    email_template_variant TEXT NOT NULL DEFAULT 'standard'
                        CHECK (email_template_variant IN ('standard', 'minimal', 'branded')),
    email_accent_color  TEXT,                       -- Overrides theme color in emails
    email_logo_url      TEXT,                       -- Overrides theme logo in emails

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 4.5 `tenant_domain_config`

Tracks custom domain setup and SSL status.

```sql
CREATE TABLE tenant_domain_config (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,

    -- Domain configuration
    custom_domain       TEXT UNIQUE,               -- e.g., realdealkickzsc.com
    subdomain           TEXT NOT NULL UNIQUE,       -- e.g., realdealkickzsc (for .sneakereco.com)

    -- DNS verification
    dns_verified        BOOLEAN NOT NULL DEFAULT FALSE,
    dns_verification_token TEXT,
    dns_verified_at     TIMESTAMPTZ,

    -- SSL
    ssl_provisioned     BOOLEAN NOT NULL DEFAULT FALSE,
    ssl_provisioned_at  TIMESTAMPTZ,

    -- Cloudflare zone
    cloudflare_zone_id  TEXT,                      -- If managed through our Cloudflare

    -- Admin subdomain
    admin_domain        TEXT,                       -- admin.realdealkickzsc.com or admin.realdealkickzsc.sneakereco.com

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenant_domain_custom ON tenant_domain_config (custom_domain)
    WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_tenant_domain_subdomain ON tenant_domain_config (subdomain);
```

### Schema Modification to `tenants` Table

Add these columns to the existing `tenants` schema:

```sql
ALTER TABLE tenants ADD COLUMN business_name TEXT;
ALTER TABLE tenants ADD COLUMN business_type TEXT DEFAULT 'reseller';
ALTER TABLE tenants ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN launched_at TIMESTAMPTZ;
```

---

## 5. Authentication System

### Decision: AWS Cognito

**Why Cognito over alternatives:**

| Criteria | Cognito | Clerk | Auth0 |
|----------|---------|-------|-------|
| Pricing at 200K MAU | ~$550/mo (first 50K free) | ~$1,500/mo | ~$2,300/mo |
| Per-app-client token expiry | Yes | No | Yes |
| MFA support | TOTP + SMS | Yes | Yes |
| Self-hosted UI | Yes (API-driven) | No (component lock-in) | Partial |
| Multi-tenant patterns | Official docs/patterns | Not designed for this | Yes |

### Architecture Summary

Three user types — platform admin, tenant admin, customer — each with isolated Cognito pools or clients, separate cookie paths, and distinct identity resolution in the API JWT strategy. Token storage contract: refresh token in httpOnly cookie, access token in memory, applied uniformly across all channels.

> **Full specification:** [docs/plans/subplans/AUTH_PLAN.md](./subplans/AUTH_PLAN.md)
>
> That document covers: Cognito pool configuration for all three user types, token flows, cookie isolation, CORS origin classification, MFA enforcement strategy, platform admin login at tenant dashboards, and flow isolation guarantees.

---

## 6. Multi-Tenant Architecture

### Tenant Resolution

Every request must resolve to a tenant. The resolution chain:

1. **API requests**: `X-Tenant-ID` header (set by frontend based on hostname)
2. **Webhook requests**: Lookup via `custom_fields.custom1` in PayRilla payload, or domain-based for Shippo
3. **Frontend**: Resolved from hostname in Next.js middleware

```typescript
// Next.js middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Pattern: admin.storename.sneakereco.com → admin route, tenant = storename
  // Pattern: storename.sneakereco.com → storefront, tenant = storename
  // Pattern: admin.customdomain.com → admin route, tenant from domain lookup
  // Pattern: customdomain.com → storefront, tenant from domain lookup

  const isAdmin = hostname.startsWith('admin.');
  const baseDomain = isAdmin ? hostname.replace('admin.', '') : hostname;

  let tenantSlug: string | null = null;

  if (baseDomain.endsWith('.sneakereco.com')) {
    tenantSlug = baseDomain.replace('.sneakereco.com', '');
  } else {
    // Custom domain - resolve via API or KV cache
    tenantSlug = await resolveTenantFromDomain(baseDomain);
  }

  // Set headers for downstream
  const response = NextResponse.next();
  response.headers.set('X-Tenant-Slug', tenantSlug);
  response.headers.set('X-Is-Admin', String(isAdmin));
  return response;
}
```

### Database-Level Isolation (RLS)

As defined in the uploaded `rdk-rls-policies.md`:

1. NestJS middleware resolves tenant from request
2. Sets PostgreSQL session variables via `SET LOCAL`
3. All queries automatically filtered by RLS policies
4. Two database roles: `sneakereco_app` (RLS enforced) and `sneakereco_system` (RLS bypassed)

```typescript
// NestJS TenantContextService
@Injectable()
export class TenantContextService {
  constructor(private readonly db: DatabaseService) {}

  async setTenantContext(tenantId: string, userId: string, role: string) {
    await this.db.execute(sql`
      SET LOCAL app.current_tenant_id = ${tenantId};
      SET LOCAL app.current_user_id = ${userId};
      SET LOCAL app.current_user_role = ${role};
    `);
  }
}
```

---

## 7. Tenant Onboarding System

### Two Onboarding Channels

**Channel 1: Inbound Request (tenant applies)**
1. Prospective tenant visits `sneakereco.com/request`
2. Fills form: email, phone, name, business name, Instagram URL, additional info
3. System creates `tenants` row (status: inactive) + `tenant_onboarding` row (request_status: pending)
4. Platform admin (you) receives email notification
5. You review and approve/reject in platform admin panel
6. On approval: system generates invite token, sends onboarding email

**Channel 2: Direct Invite (you invite them)**
1. You create tenant record in platform admin
2. System generates invite token, sends onboarding email
3. Tenant clicks link → `sneakereco.com/invite/{token}`

**Both channels converge:** After accepting invite, tenant goes through the same onboarding wizard.

### Onboarding Wizard Steps

#### Step 1: Account Creation
- Create their admin user account (Cognito)
- Set password, verify email
- Auto-create `users` + `tenant_members` (role: admin, is_owner: true)

#### Step 2: SEO Questionnaire

This questionnaire collects the data needed for the automated SEO system. Questions are tailored for sneaker resale businesses:

```
SEO ONBOARDING QUESTIONNAIRE
=============================

BUSINESS IDENTITY
1. Business description (1-2 sentences describing your store)
   → Used for: meta descriptions, about page, structured data

2. What makes your store unique? Select all that apply:
   [ ] Authenticated/verified sneakers
   [ ] Rare/limited edition focus
   [ ] Below-retail pricing
   [ ] Local pickup available
   [ ] Fast shipping
   [ ] Wide size selection
   [ ] Specific brand specialty
   [ ] Custom: ___________
   → Used for: USP badges, meta descriptions, ad copy

3. What brands do you primarily sell? (select all)
   [ ] Nike  [ ] Jordan  [ ] Adidas  [ ] New Balance
   [ ] Yeezy [ ] Puma    [ ] Reebok  [ ] Converse
   [ ] Other: ___________
   → Used for: brand page generation, structured data, keyword targeting

TARGET AUDIENCE
4. Who is your typical customer?
   [ ] Sneaker collectors (resale market)
   [ ] Casual buyers looking for deals
   [ ] Athletes/performance buyers
   [ ] Fashion-forward consumers
   [ ] Gift buyers
   → Used for: content tone, keyword selection

5. Geographic focus:
   [ ] Local (specific city/state)  → Which? ___________
   [ ] Regional (multiple states)
   [ ] National (USA)
   [ ] International
   → Used for: local SEO, geo-targeted meta tags

SOCIAL & BRAND
6. Instagram handle: @___________
7. Other social links (optional): TikTok, Twitter, Facebook
8. Upload your logo (PNG/SVG, min 200x200)
9. Upload your favicon (PNG/ICO, 32x32 or 64x64)

CONTENT PREFERENCES
10. Store tagline or motto (optional): ___________
    → Used for: site title suffix, OG image text

11. Preferred tone of product descriptions:
    [ ] Professional/clean
    [ ] Streetwear/hype culture
    [ ] Casual/friendly
    [ ] Luxury/premium
    → Used for: auto-generated meta descriptions
```

All answers stored in `tenant_onboarding.seo_answers` (JSONB) and processed by the SEO service to populate `tenant_seo_config`.

#### Step 3: Payment Integration (Skippable)

- Tenant provides their PayRilla credentials (API key, PIN, tokenization key)
- Credentials stored in AWS SSM Parameter Store at `/sneakereco/{env}/payrilla/{tenant_id}/`
- System verifies credentials by making a test API call
- If skipped: store marked with `payment_integration_completed = false`, cannot go live

#### Step 4: Shipping Integration (Skippable)

- Tenant provides their Shippo API token and webhook secret
- Credentials stored in AWS SSM Parameter Store at `/sneakereco/{env}/shippo/{tenant_id}/`
- Tenant configures shipping origin address (stored in `tenant_shipping_config`)
- Tenant selects enabled carriers (UPS, USPS, FedEx)
- If skipped: same as payment, cannot go live

#### Step 5: Domain Setup

- Tenant enters their custom domain (optional)
- If no custom domain: assigned `{slug}.sneakereco.com`
- If custom domain:
  1. System generates DNS verification TXT record
  2. Tenant adds TXT record to their domain's DNS
  3. System verifies via DNS lookup
  4. System creates CNAME pointing to Coolify droplet IP
  5. Coolify provisions SSL via Lets Encrypt automatically
- Admin domain auto-configured as `admin.{domain}`

#### Step 6: Theme Configuration

- Color picker for primary, secondary, accent colors
- Logo upload (stored in R2)
- Component variant selection (header, hero, footer, filter, product card)
- Hero content configuration
- Live preview of storefront

### Post-Onboarding Launch

When all required steps are complete (payment + shipping at minimum):
1. Tenant status changes from `inactive` to `active`
2. `launched_at` timestamp set
3. Store becomes publicly accessible
4. Initial sitemap generated and submitted to Google Search Console

---

## 8. Automated SEO System

### Philosophy

SEO should be invisible to the seller during product creation. No extra fields, no manual meta tag entry. The system auto-generates everything from:
- Product data (name, brand, model, category, price)
- Tenant SEO config (from onboarding questionnaire)
- Structured data templates

### Auto-Generated SEO Elements

**Per Product Page:**
```html
<title>{{brand}} {{model}} {{name}} | {{store_name}}</title>
<meta name="description" content="Shop {{brand}} {{model}} {{name}} - {{condition}} condition. {{price}}. {{usp_1}}. {{usp_2}}. Free shipping available.">
<meta property="og:title" content="{{brand}} {{model}} {{name}}">
<meta property="og:description" content="{{condition}} {{brand}} {{model}} - {{price}}">
<meta property="og:image" content="{{primary_image_url}}">
<meta property="og:type" content="product">
<meta property="product:price:amount" content="{{price}}">
<meta property="product:price:currency" content="USD">
<meta property="product:availability" content="{{in_stock ? 'in stock' : 'out of stock'}}">

<!-- JSON-LD Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{{brand}} {{model}} {{name}}",
  "image": "{{primary_image_url}}",
  "description": "{{description || auto_description}}",
  "brand": { "@type": "Brand", "name": "{{brand}}" },
  "sku": "{{sku}}",
  "offers": {
    "@type": "Offer",
    "price": "{{price}}",
    "priceCurrency": "USD",
    "availability": "https://schema.org/{{in_stock ? 'InStock' : 'OutOfStock'}}",
    "seller": { "@type": "Organization", "name": "{{store_name}}" }
  },
  "category": "{{category}}"
}
</script>
```

**Per Collection/Category Page:**
```html
<title>{{category}} Collection | {{store_name}}</title>
<meta name="description" content="Browse {{count}} {{category}} items at {{store_name}}. {{business_description}}. Shop now.">
```

**Sitemap Generation (per tenant):**
- Auto-generated `sitemap.xml` at `{domain}/sitemap.xml`
- Includes: homepage, shop page, all active product pages, category pages, about, contact
- Updated via BullMQ job whenever products are created/updated/deleted
- Submitted to Google Search Console via API (if verification is configured)

**robots.txt (per tenant):**
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /checkout/
Sitemap: https://{domain}/sitemap.xml
```

### SEO Service Implementation

```typescript
@Injectable()
export class SeoService {
  async generateProductMeta(product: Product, tenantSeo: TenantSeoConfig): Promise<MetaTags> {
    const title = tenantSeo.meta_title_template
      .replace('{{product_name}}', `${product.brand} ${product.model || ''} ${product.name}`.trim())
      .replace('{{store_name}}', tenantSeo.storeName);

    const description = tenantSeo.meta_description_template
      .replace('{{product_name}}', product.name)
      .replace('{{store_name}}', tenantSeo.storeName)
      .replace('{{business_description}}', tenantSeo.business_description || '');

    return { title, description, ogImage: product.primaryImageUrl };
  }

  async generateSitemap(tenantId: string): Promise<string> {
    // Query all active products, generate XML sitemap
    // Store in R2 at {tenant_slug}/sitemap.xml
    // Return URL
  }
}
```

---

## 9. Custom Domain System

### Domain Architecture

```
TENANT WITH CUSTOM DOMAIN:
  realdealkickzsc.com          → Storefront (Coolify on DO)
  admin.realdealkickzsc.com    → Admin Dashboard (Coolify on DO)

TENANT WITHOUT CUSTOM DOMAIN:
  realdealkickzsc.sneakereco.com         → Storefront (Coolify on DO)
  admin.realdealkickzsc.sneakereco.com   → Admin Dashboard (Coolify on DO)

PLATFORM:
  sneakereco.com              → Marketing + Onboarding (Coolify on DO)
  api.sneakereco.com          → NestJS API (DO Droplet)
```

### Custom Domain Setup Flow

1. Tenant enters domain in onboarding wizard or settings
2. API generates a DNS verification token
3. Tenant adds CNAME record: `@ CNAME {coolify_droplet_ip} (A record)`
4. Tenant adds TXT record: `_sneakereco TXT verification-token`
5. API polls DNS for verification (or tenant clicks "verify")
6. Once verified:
   - Add domain to Coolify project
   - Coolify auto-provisions SSL via Let's Encrypt
   - Update `tenant_domain_config`
   - Update Cloudflare Workers KV mapping: `domain → tenant_id`

### API Domain

The API lives at `api.sneakereco.com`, NOT on individual tenant domains. All tenant frontends hit the same API endpoint with `X-Tenant-ID` headers.

---

## 10. Frontend Theming & Customization

### Current Frontend State (What Must Be Broken Up)

The existing Next.js frontend is a monolith with components tightly coupled to the single-tenant model. The following decomposition must happen during the rebuild:

**Current problems to solve:**
- Components reference hardcoded brand colors, logos, and store names
- No concept of "variants" for headers, heroes, footers, etc.
- Product pages, checkout, and admin pages are interleaved in a flat route structure
- Supabase client is imported directly inside components (must be replaced with API client)
- Cart service uses hardcoded localStorage keys without tenant scoping
- Auth is wired to Supabase auth (must be replaced with Cognito)
- Many components are oversized (5000+ line files reported) and must be decomposed

### Frontend Decomposition Plan

Every existing page and component must be rebuilt into the modular, tenant-aware architecture. Here is the mapping from the current frontend to the new structure:

#### Storefront Pages (customer-facing)

| Current Page/Component | New Location | Changes Required |
|------------------------|-------------|-----------------|
| Homepage | `app/(storefront)/page.tsx` | Render tenant-selected hero variant, featured items, branding |
| Product listing / Shop | `app/(storefront)/shop/page.tsx` | Use tenant-selected filter variant (sidebar/top_bar/drawer), product card variant |
| Product detail | `app/(storefront)/product/[id]/page.tsx` | Auto-generated SEO meta tags, tenant-branded layout |
| Cart page | `app/(storefront)/cart/page.tsx` | Tenant-scoped cart keys, tenant branding |
| Checkout | `app/(storefront)/checkout/page.tsx` | PayRilla tokenization with per-tenant keys, guest checkout support |
| Order status | `app/(storefront)/order-status/[id]/page.tsx` | Token-based guest access, tenant branding |
| About page | `app/(storefront)/about/page.tsx` | Content from `tenant_theme_config.about_content`, conditionally shown |
| Contact page | `app/(storefront)/contact/page.tsx` | Per-tenant support email, conditionally shown |
| Auth pages | `app/(storefront)/auth/login/page.tsx` etc. | Cognito auth, tenant-scoped user creation |

#### Admin Pages

| Current Page/Component | New Location | Changes Required |
|------------------------|-------------|-----------------|
| Admin dashboard | `app/admin/page.tsx` | Aggregate stats from API, tenant-branded |
| Product management | `app/admin/products/page.tsx` | Full CRUD via API client, image upload to R2 |
| Order management | `app/admin/orders/page.tsx` | Fulfillment workflow, refund handling |
| Customer list | `app/admin/customers/page.tsx` | Aggregated from orders/payments (no customer table) |
| Shipping settings | `app/admin/shipping/page.tsx` | Per-tenant config, carrier selection, origin address |
| Tax settings | `app/admin/tax/page.tsx` | Nexus dashboard, tax enable/disable |
| Theme settings | `app/admin/settings/theme/page.tsx` | **NEW** - Color picker, variant selection, live preview |
| Domain settings | `app/admin/settings/domain/page.tsx` | **NEW** - Custom domain setup wizard |
| SEO settings | `app/admin/settings/seo/page.tsx` | **NEW** - Edit SEO config, preview meta tags |
| Email settings | `app/admin/settings/email/page.tsx` | **NEW** - Sender identity, template variant selection |
| Integration settings | `app/admin/settings/integrations/page.tsx` | **NEW** - PayRilla/Shippo credential management |
| Featured items | `app/admin/featured/page.tsx` | Drag-and-drop reordering |
| Email audit log | `app/admin/email-audit/page.tsx` | View sent emails, re-render from template data |
| Catalog management | `app/admin/products/catalog/page.tsx` | Brand/model taxonomy, aliases |

#### Component Decomposition

The current monolithic components must be split into small, single-responsibility components. Here is the target component architecture:

```
src/components/
├── ui/                           # Shadcn/ui primitives (Button, Input, Dialog, etc.)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── select.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── toast.tsx
│   ├── skeleton.tsx
│   └── ... (all shadcn components)
│
├── storefront/                   # Tenant-customizable storefront components
│   ├── headers/                  # Header variants (tenant selects one)
│   │   ├── HeaderClassic.tsx     # Logo left, nav center, cart right
│   │   ├── HeaderMinimal.tsx     # Logo + hamburger menu
│   │   ├── HeaderCentered.tsx    # Centered logo, nav below
│   │   └── index.tsx             # Variant router
│   │
│   ├── heroes/                   # Hero section variants
│   │   ├── HeroFullWidth.tsx     # Full-width background image with overlay text
│   │   ├── HeroSplit.tsx         # Image left, text right (or vice versa)
│   │   ├── HeroSlider.tsx        # Carousel of images with captions
│   │   └── index.tsx
│   │
│   ├── product-cards/            # Product card variants
│   │   ├── ProductCardStandard.tsx   # Image, title, price, quick-add
│   │   ├── ProductCardMinimal.tsx    # Image + price only, hover for details
│   │   ├── ProductCardDetailed.tsx   # Image, title, brand, condition badge, sizes
│   │   └── index.tsx
│   │
│   ├── product-grid/
│   │   └── ProductGrid.tsx       # Responsive grid that uses selected card variant
│   │
│   ├── filters/                  # Product filter variants
│   │   ├── FilterSidebar.tsx     # Left sidebar with collapsible sections
│   │   ├── FilterTopBar.tsx      # Horizontal filter bar above products
│   │   ├── FilterDrawer.tsx      # Slide-in drawer (mobile-first)
│   │   └── index.tsx
│   │
│   ├── footers/                  # Footer variants
│   │   ├── FooterStandard.tsx    # Multi-column with links, social, newsletter
│   │   ├── FooterMinimal.tsx     # Single line: copyright + social icons
│   │   ├── FooterExtended.tsx    # Full footer with about blurb, map, hours
│   │   └── index.tsx
│   │
│   ├── product-detail/           # Product detail page components
│   │   ├── ProductImageGallery.tsx
│   │   ├── ProductInfo.tsx       # Title, price, condition, description
│   │   ├── SizeSelector.tsx      # Size grid with stock indicators
│   │   ├── AddToCartButton.tsx
│   │   └── RelatedProducts.tsx
│   │
│   ├── cart/
│   │   ├── CartDrawer.tsx        # Slide-out cart summary
│   │   ├── CartItem.tsx          # Single cart line item
│   │   └── CartSummary.tsx       # Subtotal, shipping estimate, checkout CTA
│   │
│   ├── checkout/
│   │   ├── CheckoutForm.tsx      # Multi-step checkout wrapper
│   │   ├── ShippingStep.tsx      # Address form with HERE Maps autocomplete
│   │   ├── PaymentStep.tsx       # PayRilla hosted tokenization iframe
│   │   ├── ReviewStep.tsx        # Order review before submission
│   │   ├── FulfillmentToggle.tsx # Ship vs. pickup selector
│   │   └── GuestCheckoutBanner.tsx
│   │
│   ├── order-status/
│   │   ├── OrderTimeline.tsx     # Visual timeline of order events
│   │   ├── OrderSummary.tsx      # Items, totals, addresses
│   │   └── TrackingInfo.tsx      # Carrier + tracking number
│   │
│   └── layout/
│       ├── StorefrontLayout.tsx  # Wraps header + main + footer
│       ├── NavMenu.tsx           # Navigation menu items
│       ├── MobileMenu.tsx        # Mobile hamburger menu
│       ├── AnnouncementBar.tsx   # Optional top banner
│       └── NewsletterSignup.tsx  # Email subscription form
│
├── admin/                        # Admin dashboard components (not tenant-customizable)
│   ├── layout/
│   │   ├── AdminLayout.tsx       # Sidebar + topbar + main content
│   │   ├── AdminSidebar.tsx      # Navigation sidebar
│   │   ├── AdminTopbar.tsx       # Search, notifications, user menu
│   │   └── AdminBreadcrumb.tsx
│   │
│   ├── dashboard/
│   │   ├── StatsCard.tsx         # Revenue, orders, etc. KPI card
│   │   ├── RecentOrders.tsx      # Last 10 orders table
│   │   └── SalesChart.tsx        # Revenue over time chart
│   │
│   ├── products/
│   │   ├── ProductForm.tsx       # Create/edit product form
│   │   ├── VariantManager.tsx    # Add/remove/edit size variants
│   │   ├── ImageUploader.tsx     # Drag-and-drop image upload with reordering
│   │   ├── ProductTable.tsx      # Sortable/filterable product list
│   │   └── ProductFiltersBar.tsx # Admin-side product list filters
│   │
│   ├── orders/
│   │   ├── OrderTable.tsx        # Sortable order list with status badges
│   │   ├── OrderDetail.tsx       # Full order view with timeline
│   │   ├── FulfillmentPanel.tsx  # Ship/pickup actions, label purchase
│   │   ├── RefundDialog.tsx      # Refund confirmation dialog
│   │   └── ShippingLabelPanel.tsx # Shippo rate quotes + label purchase
│   │
│   ├── customers/
│   │   ├── CustomerTable.tsx     # Customer list (aggregated from orders)
│   │   └── CustomerDetail.tsx    # Total spend, order history, activity
│   │
│   ├── settings/
│   │   ├── ThemeEditor.tsx       # Visual theme editor with live preview
│   │   ├── ColorPicker.tsx       # Hex color picker component
│   │   ├── VariantSelector.tsx   # Radio cards for header/hero/footer selection
│   │   ├── DomainSetup.tsx       # DNS verification wizard
│   │   ├── SeoEditor.tsx         # Edit meta templates, preview output
│   │   ├── EmailConfigForm.tsx   # Sender identity, template selection
│   │   ├── IntegrationCard.tsx   # PayRilla/Shippo credential forms
│   │   └── LivePreview.tsx       # Iframe preview of storefront with current theme
│   │
│   └── shared/
│       ├── DataTable.tsx         # Reusable sortable/paginated table
│       ├── EmptyState.tsx        # Empty state illustrations
│       ├── StatusBadge.tsx       # Order/payment status badges
│       ├── MoneyDisplay.tsx      # Cents → formatted currency
│       ├── ConfirmDialog.tsx     # "Are you sure?" confirmation
│       └── SearchInput.tsx       # Debounced search input
│
└── shared/                       # Components used by both storefront and admin
    ├── TenantProvider.tsx        # React context providing tenant config
    ├── AuthProvider.tsx          # Cognito auth state management
    ├── ErrorBoundary.tsx         # React error boundary with fallback UI
    ├── LoadingSpinner.tsx
    ├── SeoHead.tsx               # Dynamic meta tags from tenant SEO config
    ├── StructuredData.tsx        # JSON-LD injection
    └── ImageWithFallback.tsx     # R2 image with loading skeleton + error fallback
```

### Critical Migration Rules for Component Rebuild

Every component in the new system must follow these rules. The AI coding assistant implementing this should enforce them:

1. **No direct database/Supabase imports.** Every component gets data from the API client or React Server Components that call the API. No `createClient()`, no `supabase.from()`.

2. **No hardcoded tenant values.** Colors come from CSS variables. Store name comes from `TenantProvider`. Logos come from tenant config. If you see a hardcoded hex color or a string like "RealDealKickzSC" in a component, it's wrong.

3. **All storefront components must work with CSS variables.** Use `var(--color-primary)` not `#2563EB`. Use `var(--font-heading)` not `'Inter'`.

4. **Variant components share the same props interface.** Every header variant accepts the same `HeaderProps`, every hero accepts `HeroProps`, etc. The variant router passes props through unchanged.

5. **No business logic in components.** Validation, price calculation, stock checking — all happens in the API. Components display data and collect input.

6. **Admin components are NOT customizable per tenant.** Admin uses a fixed design system (Shadcn/ui). Only the logo, accent color, and store name adapt.

7. **Mobile-first responsive design.** All storefront variants must work on mobile. The current codebase has mobile issues — this is the opportunity to fix them.

8. **Cart scoped by tenant.** Cart localStorage key must include tenant slug: `sneakereco_cart_{tenant_slug}_{user_id || 'guest'}`.

9. **Auth-aware components use `useAuth()` hook.** Never check auth state by looking at cookies or localStorage directly.

10. **Image URLs always go through the R2 CDN domain.** Product images, logos, hero images all served from `cdn.sneakereco.com/{path}`.

### CSS Variable Injection

Each tenant's theme config is fetched on initial page load and injected as CSS custom properties:

```typescript
// lib/theme.ts
export function injectTenantTheme(theme: TenantThemeConfig) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.color_primary);
  root.style.setProperty('--color-secondary', theme.color_secondary);
  root.style.setProperty('--color-accent', theme.color_accent);
  root.style.setProperty('--color-background', theme.color_background);
  root.style.setProperty('--color-surface', theme.color_surface);
  root.style.setProperty('--color-text', theme.color_text);
  root.style.setProperty('--color-text-muted', theme.color_text_muted);
  root.style.setProperty('--color-border', theme.color_border);
  root.style.setProperty('--color-error', theme.color_error);
  root.style.setProperty('--color-success', theme.color_success);
  root.style.setProperty('--font-heading', theme.font_heading);
  root.style.setProperty('--font-body', theme.font_body);
  root.style.setProperty('--border-radius', theme.border_radius);
  root.style.setProperty('--max-content-width', theme.max_content_width);
}
```

### Tailwind CSS Integration

Use Tailwind with CSS variables so all utility classes automatically reflect tenant theming:

```javascript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        foreground: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        border: 'var(--color-border)',
        error: 'var(--color-error)',
        success: 'var(--color-success)',
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
      },
      borderRadius: {
        DEFAULT: 'var(--border-radius)',
      },
      maxWidth: {
        content: 'var(--max-content-width)',
      },
    },
  },
};
```

Now components use Tailwind naturally and everything adapts: `<button className="bg-primary text-white rounded">` renders differently for each tenant.

### Component Variant System

Headers, heroes, footers, product cards, and filters each have multiple variants. The tenant's theme config specifies which variant to render:

```tsx
// components/storefront/headers/index.tsx
import { lazy, Suspense } from 'react';

const HEADER_VARIANTS = {
  classic: lazy(() => import('./HeaderClassic')),
  minimal: lazy(() => import('./HeaderMinimal')),
  centered: lazy(() => import('./HeaderCentered')),
};

export type HeaderVariant = keyof typeof HEADER_VARIANTS;

export interface HeaderProps {
  logoUrl: string | null;
  storeName: string;
  navItems: Array<{ label: string; href: string }>;
  cartItemCount: number;
  isAuthenticated: boolean;
}

export function Header({ variant, ...props }: { variant: HeaderVariant } & HeaderProps) {
  const Component = HEADER_VARIANTS[variant];
  return (
    <Suspense fallback={<div className="h-16 bg-surface animate-pulse" />}>
      <Component {...props} />
    </Suspense>
  );
}
```

All variants use the same CSS variables and accept the same props. The structural layout differs between variants.

### Storefront Page Assembly

The root storefront layout assembles the tenant-selected components:

```tsx
// app/(storefront)/layout.tsx
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const tenantConfig = await getTenantConfig(); // Server-side fetch

  return (
    <TenantProvider config={tenantConfig}>
      <ThemeInjector theme={tenantConfig.theme} />
      <Header
        variant={tenantConfig.theme.header_variant}
        logoUrl={tenantConfig.theme.logo_url}
        storeName={tenantConfig.name}
        navItems={buildNavItems(tenantConfig)}
        cartItemCount={0} // Hydrated client-side
        isAuthenticated={false} // Hydrated client-side
      />
      <main className="min-h-screen bg-background">
        {children}
      </main>
      <Footer
        variant={tenantConfig.theme.footer_variant}
        storeName={tenantConfig.name}
        socialLinks={tenantConfig.seo.social_links}
        showNewsletter={true}
      />
    </TenantProvider>
  );
}
```

### API Client (Replaces Direct Supabase Access)

Every data fetch in the frontend goes through a typed API client generated from the OpenAPI spec:

```typescript
// lib/api-client.ts
import createClient from 'openapi-fetch';
import type { paths } from '@sneakereco/shared/api-types'; // Auto-generated from OpenAPI spec

export function createApiClient(tenantId: string, accessToken?: string) {
  return createClient<paths>({
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    headers: {
      'X-Tenant-ID': tenantId,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
}

// Usage in a Server Component:
const api = createApiClient(tenantId);
const { data: products } = await api.GET('/v1/storefront/products', {
  params: { query: { category: 'sneakers', page: 1, limit: 20 } },
});

// Usage in a Client Component (via React Query):
const { data } = useQuery({
  queryKey: ['products', filters],
  queryFn: () => api.GET('/v1/storefront/products', { params: { query: filters } }),
});
```

---

## 11. Admin Dashboard

### Access Pattern

- Admins sign in at `admin.{domain}/login`
- Uses the admin Cognito app client (30-min tokens, MFA required)
- Separate sign-in page, separate auth flow from customer storefront
- All admin pages behind `AdminGuard` in the API

### Admin Dashboard Visual Consistency

Every tenant's admin dashboard uses the same UI components and layout. The only customization is:
- Logo (from tenant branding)
- Accent color (from tenant theme)
- Store name in the header

This is NOT a white-label admin. It's a shared admin UI with tenant branding applied.

---

## 12. Email System

### Per-Tenant Email Configuration

Each tenant can have their own sender identity:
- `orders@businessname.com`
- `support@businessname.com`

**Implementation: AWS SES Domain Verification + Email Forwarding**

1. During onboarding, tenant provides their domain
2. System adds SES domain verification DNS records (DKIM, SPF, DMARC)
3. Tenant adds DNS records to their domain
4. Once verified, SES can send from `anything@theirdomain.com`
5. For receiving emails (support@, info@), use email forwarding:
   - Cloudflare Email Routing (if domain is on Cloudflare)
   - Or AWS SES receiving rules → forward to tenant's actual email

**Email Templates:**

Three template variants available per tenant:
- `standard`: Clean, professional layout
- `minimal`: Text-focused, minimal styling
- `branded`: Heavy branding with colors, logo, hero images

Template data (not HTML) stored in `email_audit_log.template_data`. Frontend reconstructs email for admin "View Email" feature.

---

## 13. Payment Layer

### Architecture (Unchanged from Current)

Each tenant holds their own PayRilla merchant account. RDK is a pure technology platform, not a merchant of record.

**Payment Flow:**
1. Frontend loads PayRilla Hosted Tokenization iframe with tenant's tokenization key
2. Customer enters card data (never touches our servers)
3. Frontend calls `hostedTokenization.getNonceToken()` → gets nonce
4. Frontend sends nonce + order details to API
5. API creates auth-only charge via PayRilla API (`capture: false`)
6. API screens transaction via NoFraud
7. If NoFraud passes: capture the charge
8. If NoFraud fails: void the charge, mark order failed
9. If NoFraud review: flag order, alert admin

**Credential Storage:**
- Per-tenant PayRilla credentials in AWS SSM Parameter Store
- Key pattern: `/sneakereco/{env}/payrilla/{tenant_id}/{credential_name}`
- Cached in memory for 1 hour via TTL cache

**Digital Wallets:**
- Apple Pay and Google Pay supported per PayRilla documentation
- Wallet transactions captured immediately (no separate capture step)
- Each tenant configures their own Apple Pay/Google Pay merchant IDs in PayRilla portal

**Webhooks:**
- Single webhook endpoint: `POST api.sneakereco.com/webhooks/payrilla`
- Tenant resolved from `custom_fields.custom1` in webhook payload
- HMAC signature verification using per-tenant webhook secret
- Idempotency via `webhook_events` table

---

## 14. Fraud Detection

### NoFraud Integration (Unchanged)

**Flow:** Auth-only charge → NoFraud screening → capture or void

**Decisions:**
- `pass` → capture charge, proceed with fulfillment
- `fail` → void charge, mark order failed, log in audit_events
- `review` → flag order (status: review), alert admin, hold fulfillment

NoFraud's chargeback guarantee covers fraudulent card use only. Item-not-received and item-not-as-described disputes are defended via the `chargeback_evidence` table (EvidenceService).

---

## 15. Tax & Nexus System

### ZipTax + Custom Nexus (Unchanged)

- ZipTax API for rate lookups (cached in Valkey, 30-day TTL)
- Per-tenant tax settings in `tenant_tax_settings`
- Per-tenant nexus registrations in `nexus_registrations`
- State sales tracking via DB trigger on order status change
- Tax only collected in states where tenant has nexus registration

---

## 16. Shipping & Fulfillment

### Shippo Integration (Per-Tenant)

- Each tenant has their own Shippo account
- API token stored in AWS SSM Parameter Store
- Webhook secret stored in AWS SSM Parameter Store
- Shipping origin address in `tenant_shipping_config`

**Webhook handling:**
- Single endpoint: `POST api.sneakereco.com/webhooks/shippo`
- Tenant resolved from tracking number → order → tenant lookup
- Events stored in `shipping_tracking_events`

---

## 17. Storage & CDN

### Cloudflare R2

**Bucket structure:**
```
sneakereco-production/
├── {tenant_slug}/
│   ├── products/
│   │   └── {product_id}/
│   │       └── {hash}.{ext}
│   ├── branding/
│   │   ├── logo.{ext}
│   │   ├── favicon.{ext}
│   │   └── hero.{ext}
│   ├── contact/
│   │   └── {message_id}/
│   │       └── {hash}.{ext}
│   └── sitemap.xml
```

**CDN:** Cloudflare CDN sits in front of R2 automatically. Public bucket with custom domain: `cdn.sneakereco.com/{path}`.

---

## 18. Queue & Background Jobs

### BullMQ Queues

| Queue | Purpose | Concurrency | Retry |
|-------|---------|-------------|-------|
| `email` | Order confirmations, shipping updates, admin alerts | 5 | 3 attempts, exponential backoff |
| `image` | Upload to R2, resize, background removal | 3 | 2 attempts |
| `seo` | Sitemap regeneration, meta tag updates | 1 | 2 attempts |
| `webhook` | Failed webhook reprocessing | 3 | 5 attempts, 1-hour backoff |
| `cleanup` | Expired tokens, abandoned orders, stale cache | 1 | 1 attempt |
| `tracking` | Poll Shippo for tracking updates | 2 | 3 attempts |

### Scheduled Jobs (via BullMQ repeatable jobs)

| Job | Schedule | Action |
|-----|----------|--------|
| Cleanup expired order access tokens | Daily 2 AM | Delete tokens past `expires_at` |
| Cleanup abandoned orders | Daily 3 AM | Cancel orders in `pending` status > 24 hours |
| Regenerate sitemaps | Daily 4 AM | Rebuild sitemaps for all active tenants |
| Tax rate cache refresh | Weekly Sunday 5 AM | Re-fetch ZipTax rates for cached zip codes |

---

## 19. Caching Layer

### Valkey (Redis) Cache Strategy

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `tenant:{slug}` | 5 min | Tenant config (theme, SEO, domain) |
| `tenant:domain:{domain}` | 10 min | Domain → tenant_id mapping |
| `products:{tenant_id}:list:{hash}` | 2 min | Product list queries |
| `product:{id}` | 5 min | Single product detail |
| `filters:{tenant_id}` | 5 min | Available filter values |
| `tax:{zip}` | 30 days | ZipTax rate lookup |
| `payrilla:{tenant_id}` | 1 hour | PayRilla credentials |
| `rate_limit:{ip}:{endpoint}` | 1 min | Rate limiting counters |
| `session:{token}` | varies | Auth session data |

Cache invalidation: Explicit invalidation on write operations. No lazy expiry reliance for business-critical data.

---

## 20. API Design

### Base URL

`https://api.sneakereco.com/v1`

### Authentication Header

```
Authorization: Bearer {cognito_access_token}
X-Tenant-ID: tnt_01HXYZ...
```

### Response Format

```json
{
  "data": { ... },
  "meta": {
    "requestId": "req_01HXYZ...",
    "timestamp": "2026-03-30T12:00:00Z"
  }
}
```

Error response:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": { "field": ["error message"] }
  },
  "meta": {
    "requestId": "req_01HXYZ...",
    "timestamp": "2026-03-30T12:00:00Z"
  }
}
```

### Core Endpoints

Refer to the existing API spec for PayRilla endpoints. The NestJS API endpoints follow RESTful conventions:

**Public (no auth):**
- `GET /v1/storefront/products` — List products with filters
- `GET /v1/storefront/products/:id` — Product detail
- `GET /v1/storefront/filters` — Available filter values
- `GET /v1/storefront/featured` — Featured items
- `POST /v1/storefront/contact` — Contact form submission
- `POST /v1/storefront/subscribe` — Newsletter subscription
- `GET /v1/storefront/config` — Tenant config (theme, SEO, branding)

**Customer (auth required):**
- `POST /v1/checkout` — Create order + process payment
- `GET /v1/orders` — List customer's orders
- `GET /v1/orders/:id` — Order status
- `GET /v1/addresses` — Customer address book
- `POST/PUT/DELETE /v1/addresses` — Manage addresses

**Admin (auth + admin role):**
- `GET/POST/PUT/DELETE /v1/admin/products`
- `GET/PUT /v1/admin/orders`
- `POST /v1/admin/orders/:id/fulfill`
- `POST /v1/admin/orders/:id/refund`
- `GET /v1/admin/customers`
- `GET /v1/admin/customers/:id`
- `GET/PUT /v1/admin/settings/theme`
- `GET/PUT /v1/admin/settings/seo`
- `GET/PUT /v1/admin/settings/email`
- `GET/PUT /v1/admin/settings/shipping`
- `GET/PUT /v1/admin/settings/tax`
- `GET/PUT /v1/admin/settings/domain`
- `GET /v1/admin/audit-events`
- `GET /v1/admin/email-audit`

**Platform (platform admin only):**
- `GET /v1/platform/tenants`
- `POST /v1/platform/tenants/approve`
- `POST /v1/platform/tenants/invite`

**Webhooks (signature verified):**
- `POST /v1/webhooks/payrilla`
- `POST /v1/webhooks/shippo`

**Health:**
- `GET /v1/health`

---

## 21. Testing Strategy

### Test Pyramid

```
          ┌──────────┐
          │   E2E    │  ~20 tests (Playwright)
          │  Tests   │  Critical user flows
         ┌┴──────────┴┐
         │ Integration │  ~100 tests
         │   Tests     │  Service + DB
        ┌┴────────────┴┐
        │    Unit       │  ~300 tests
        │   Tests       │  Pure logic, mocked deps
        └──────────────┘
```

### Unit Tests (Jest)

Test pure business logic with mocked dependencies:
- Pricing calculations (subtotal, shipping, tax, total)
- SKU generation
- ULID generation
- Validation logic
- NoFraud payload building
- Token hashing
- SEO template rendering

### Integration Tests (Jest + Testcontainers)

Test service + database interaction with real PostgreSQL (via Docker):
- Product CRUD with variant management
- Order creation with stock decrement
- RLS policy enforcement (tenant isolation)
- Tax calculation with nexus lookup
- Webhook idempotency

### E2E Tests (Playwright)

Test critical user flows through the actual UI:
- Customer: browse → add to cart → checkout → order status
- Admin: sign in → create product → view orders → fulfill order
- Onboarding: accept invite → complete wizard → launch store

### Database Tests

- Migration up/down roundtrip verification
- RLS policy tests (ensure tenant A cannot see tenant B data)
- Trigger tests (stock status update, state sales tracking)
- Constraint tests (CHECK constraints, UNIQUE constraints)

### Load Tests (k6)

- Storefront product listing under 200 concurrent users
- Checkout flow under 50 concurrent users
- API rate limit verification

### Test Infrastructure

```yaml
# docker-compose.test.yml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: test
      POSTGRES_DB: sneakereco_test
    ports:
      - "5433:5432"

  valkey:
    image: valkey/valkey:8
    ports:
      - "6380:6379"
```

---

## 22. CI/CD Pipelines

### Pipeline: `ci.yml` (Every PR)

```yaml
name: CI
on:
  pull_request:
    branches: [main, staging]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint
      - run: pnpm turbo typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo test:unit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: sneakereco_test }
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      valkey:
        image: valkey/valkey:8
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @sneakereco/db migrate:test
      - run: pnpm turbo test:integration

  db-migration-check:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: sneakereco_migration_test }
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @sneakereco/db migrate:up
      - run: pnpm --filter @sneakereco/db migrate:down
      - run: pnpm --filter @sneakereco/db migrate:up  # Verify roundtrip
```

### Pipeline: `staging.yml` (Merge to staging)

```yaml
name: Deploy Staging
on:
  push:
    branches: [staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile

      # Run all tests
      - run: pnpm turbo lint typecheck test:unit

      # Build
      - run: pnpm turbo build

      # Migrate staging DB
      - run: pnpm --filter @sneakereco/db migrate:up
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}

      # Deploy API to staging droplet via SSH
      - name: Deploy API
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_DROPLET_IP }}
          username: deploy
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/sneakereco/api
            git pull origin staging
            pnpm install --frozen-lockfile
            pnpm build
            pm2 reload ecosystem.config.js

      # Deploy frontend via Coolify webhook (auto-deploys on git push,
      # but we trigger explicitly for staging to ensure build succeeds first)
      - name: Deploy Frontend
        run: |
          curl -f -X POST "${{ secrets.COOLIFY_STAGING_WEBHOOK_URL }}" \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_API_TOKEN }}"

      # Health check
      - name: Health Check
        run: |
          sleep 15
          curl -f https://api-staging.sneakereco.com/v1/health
```

### Pipeline: `production.yml` (Version tag)

Same as staging but:
- Triggered on `v*.*.*` tags
- Uses production environment secrets
- Includes post-deploy smoke test
- Notifies on failure (email/Slack)

---

## 23. Infrastructure & Deployment

### DigitalOcean Droplet (API Server)

**Spec:** 4GB RAM / 2 vCPU / 80GB SSD ($24/mo)
**OS:** Ubuntu 24.04 LTS
**Process Manager:** PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'sneakereco-api',
      script: 'dist/main.js',
      instances: 2,           // 2 instances for the API
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'sneakereco-worker',
      script: 'dist/worker.js',  // BullMQ job processor
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

**Nginx reverse proxy** on the droplet:
- `api.sneakereco.com` → `localhost:3000` (PM2 cluster)
- SSL terminated at Cloudflare (full strict mode)
- Rate limiting at Nginx level (backup to application-level)

### DigitalOcean Managed PostgreSQL

**Plan:** Basic ($15/mo) — 1GB RAM, 1 vCPU, 10GB storage
**Region:** NYC1 (same as droplet)
**Connection pooler:** Built-in PgBouncer
**Backups:** Automatic daily backups (7-day retention)

### DigitalOcean Managed Valkey

**Plan:** Basic ($10/mo) — 1GB RAM
**Region:** NYC1
**Persistence:** RDB snapshots enabled
**Eviction:** `allkeys-lru`

### DigitalOcean Droplet — Frontend (Coolify)

**Spec:** 4GB RAM / 2 vCPU / 80GB SSD ($24/mo)
**OS:** Ubuntu 24.04 LTS
**Software:** Coolify (auto-installs Docker, Traefik reverse proxy, Let's Encrypt SSL)
**Projects deployed:**
1. `sneakereco-web` — Next.js storefront + admin (standalone Docker)
2. `sneakereco-platform` — sneakereco.com marketing + onboarding (standalone Docker)

**Coolify configuration:**
- Git-push deploy from `main` branch (production) and PR branches (preview)
- Environment variables managed via Coolify UI (synced from Doppler)
- Cloudflare CDN in front for static asset caching + DDoS protection
- Auto SSL via Let's Encrypt for `*.sneakereco.com` and custom tenant domains

### Monthly Infrastructure Cost Summary

| Service | Monthly Cost |
|---------|-------------|
| DO Droplet — API | $24 |
| DO Droplet — Frontend (Coolify) | $24 |
| DO Managed PostgreSQL | $15 |
| DO Managed Valkey | $10 |
| Cloudflare (Pro plan) | $20 |
| AWS Cognito (~200K MAU) | ~$550 |
| AWS SES (email) | ~$10 |
| AWS SSM Parameter Store | ~$1 |
| Doppler (Team) | $0 (free for small teams) |
| Grafana Cloud | $0 (free tier) |
| **Total** | **~$654/mo** |

---

## 24. Observability & Analytics

### Grafana Cloud (Free Tier)

- **Logs:** Pino logger → JSON → shipped to Grafana Loki via Grafana Agent
- **Metrics:** Prometheus metrics exposed at `/metrics`, scraped by Grafana Agent
- **Traces:** OpenTelemetry traces → Grafana Tempo
- **Dashboards:** Pre-built for API latency, error rates, DB connections, queue depth

### Cloudflare Web Analytics

- Automatically tracks pageviews for all domains on Cloudflare
- No JavaScript snippet needed (uses DNS-level analytics)
- Per-tenant traffic visible by filtering by hostname
- Free, privacy-friendly (no cookies, GDPR compliant)

### Frontend Performance Monitoring (Sentry)

- Sentry free tier provides Real User Monitoring (RUM) with Core Web Vitals (LCP, FID, CLS)
- Transaction tracing for slow page loads
- Error tracking with source maps
- Per-page performance breakdown
- No Vercel dependency

### Application-Level Logging

```typescript
// NestJS Pino Logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});

// Every log includes:
// - requestId
// - tenantId
// - userId (if authenticated)
// - module (which NestJS module)
// - duration (for timed operations)
```

---

## 25. Security Posture

### Non-Negotiable Security Requirements

1. **No secrets in code or `.env` files in production.** All secrets via Doppler (app config) or AWS SSM (tenant credentials).

2. **HTTPS everywhere.** Cloudflare Full (Strict) SSL mode. HSTS headers.

3. **Input validation on every endpoint.** Zod schemas validated via NestJS pipes. No unvalidated user input reaches business logic.

4. **SQL injection prevention.** Drizzle ORM parameterized queries only. No string concatenation in queries.

5. **XSS prevention.** React auto-escapes by default. CSP headers via Cloudflare.

6. **CSRF protection.** SameSite cookies, double-submit CSRF tokens for state-changing operations.

7. **Rate limiting.** Per-IP and per-tenant rate limits on all endpoints. Stricter on auth endpoints (5 attempts/minute).

8. **Webhook signature verification.** HMAC-SHA256 verification on all incoming webhooks (PayRilla, Shippo).

9. **PCI DSS SAQ A compliance.** Card data never touches our servers. PayRilla Hosted Tokenization handles all card input via iframes.

10. **Tenant isolation.** PostgreSQL RLS enforces tenant boundaries at the database level. Application-level checks are defense-in-depth, not the primary mechanism.

11. **Secrets rotation.** Doppler supports rotation. SSM Parameter Store supports versioning.

12. **Dependency auditing.** `pnpm audit` in CI. Dependabot or Renovate for automated updates.

13. **Admin MFA required.** TOTP enforced via Cognito admin app client.

14. **Audit trail.** All admin actions logged in `audit_events`. Append-only (no DELETE RLS policy on this table).

### Security Headers (via Cloudflare)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' tokenization.payrillagateway.com services.nofraud.com; frame-src tokenization.payrillagateway.com;
```

---

## 26. Environment Variables

### `.env.example`

```bash
# ============================================================
# RDK Platform Configuration
# Copy to .env.local for development
# Production values managed via Doppler
# ============================================================

# --- Application ---
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
PLATFORM_URL=http://localhost:3002
LOG_LEVEL=debug

# --- Database ---
DATABASE_URL=postgresql://sneakereco_app:password@localhost:5432/sneakereco_dev
DATABASE_SYSTEM_URL=postgresql://sneakereco_system:password@localhost:5432/sneakereco_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# --- Valkey (Redis) ---
VALKEY_URL=redis://localhost:6379
VALKEY_PASSWORD=

# --- AWS Cognito ---
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CUSTOMER_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_ADMIN_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1

# --- AWS SES ---
SES_REGION=us-east-1
SES_FROM_EMAIL=noreply@sneakereco.com
SES_FROM_NAME=SneakerEco

# --- AWS SSM (for tenant secrets) ---
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# --- Cloudflare R2 ---
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET_NAME=sneakereco-development
R2_PUBLIC_URL=https://cdn.sneakereco.com

# --- Cloudflare API (for DNS management) ---
CLOUDFLARE_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLOUDFLARE_ZONE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# --- PayRilla (fallback for single-tenant dev) ---
PAYRILLA_API_URL=https://api.sandbox.payrillagateway.com/api/v2
PAYRILLA_SOURCE_KEY=
PAYRILLA_PIN=
PAYRILLA_TOKEN=
PAYRILLA_WEBHOOK_SECRET=

# --- NoFraud ---
NOFRAUD_API_KEY=
NOFRAUD_CUSTOMER_CODE=

# --- ZipTax ---
ZIPTAX_API_KEY=

# --- HERE Maps ---
HERE_MAPS_API_KEY=

# --- Shippo (fallback for single-tenant dev) ---
SHIPPO_API_TOKEN=
SHIPPO_WEBHOOK_SECRET=

# --- Doppler (production only) ---
# DOPPLER_TOKEN is set at the CI/deployment level, not in .env

# --- Coolify (CI/CD deploy triggers) ---
# COOLIFY_API_TOKEN=
# COOLIFY_STAGING_WEBHOOK_URL=
# COOLIFY_PRODUCTION_WEBHOOK_URL=

# --- Platform Admin ---
PLATFORM_ADMIN_EMAIL=jacob@sneakereco.com
```

---

## 27. Local Development Setup

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker & Docker Compose
- Doppler CLI (optional, for pulling production configs)

### Setup Steps

```bash
# 1. Clone and install
git clone git@github.com:sneakereco/sneakereco.git
cd sneakereco
pnpm install

# 2. Start local services (Postgres + Valkey)
docker compose up -d

# 3. Copy env
cp .env.example .env.local

# 4. Run migrations
pnpm --filter @sneakereco/db migrate:up

# 5. Seed development data
pnpm --filter @sneakereco/db seed:dev

# 6. Start all apps in development mode
pnpm dev
# This runs:
#   - API at http://localhost:3000
#   - Web at http://localhost:3001
#   - Platform at http://localhost:3002
```

### Docker Compose (Local Dev)

```yaml
# docker/docker-compose.yml
services:
  postgres:
    image: postgres:17
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: sneakereco_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-roles.sql:/docker-entrypoint-initdb.d/01-roles.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  valkey:
    image: valkey/valkey:8
    ports:
      - "6379:6379"
    volumes:
      - valkey_data:/data

volumes:
  postgres_data:
  valkey_data:
```

```sql
-- docker/init-roles.sql
CREATE ROLE sneakereco_app LOGIN PASSWORD 'password';
CREATE ROLE sneakereco_system LOGIN PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE sneakereco_dev TO sneakereco_app;
GRANT ALL PRIVILEGES ON DATABASE sneakereco_dev TO sneakereco_system;
ALTER ROLE sneakereco_system SET row_security TO off;
```

### Staging Environment

Staging mirrors production infrastructure but:
- Separate DO Droplet (smallest size)
- Separate DO Managed PostgreSQL (smallest)
- Separate DO Managed Valkey (smallest)
- Separate Coolify instance (or same instance, separate environment)
- Separate Cognito user pool
- Services NOT running 24/7 - spun up on demand for testing, can be paused to save cost

---

## 28. Migration Strategy

### Phase 1: Foundation (Weeks 1-4)

1. Set up monorepo with Turborepo + pnpm
2. Configure all tooling (ESLint, Prettier, TypeScript)
3. Set up Docker Compose for local dev
4. Create Drizzle schema for all 34 tables (29 existing + 5 new)
5. Write and test all migrations
6. Set up RLS policies and triggers
7. Set up NestJS project skeleton with modules
8. Implement auth module (Cognito integration)
9. Implement tenant resolution middleware
10. Implement database module with RLS context

### Phase 2: Core API (Weeks 5-8)

1. Products module (CRUD, variants, images, filters)
2. Orders module (checkout, pricing, fulfillment)
3. Payments module (PayRilla integration)
4. Fraud module (NoFraud integration)
5. Tax module (ZipTax + nexus)
6. Shipping module (Shippo integration)
7. Communications module (email, contact, subscribers)
8. Write unit + integration tests for all modules

### Phase 3: Multi-Tenant Features (Weeks 9-12)

1. Tenant onboarding flow (platform site)
2. SEO questionnaire + auto-generation
3. Theme configuration system
4. Custom domain setup flow
5. Per-tenant email configuration
6. Admin dashboard API endpoints
7. Per-tenant credential management (SSM)

### Phase 4: Frontend (Weeks 13-18)

1. Next.js project setup with tenant middleware
2. Storefront component variants (headers, heroes, etc.)
3. Theme injection system
4. Admin dashboard pages
5. Checkout flow with PayRilla tokenization
6. Customer account pages
7. Platform site (sneakereco.com)

### Phase 5: Testing & Hardening (Weeks 19-22)

1. E2E tests (Playwright)
2. Load testing (k6)
3. Security audit (OWASP checklist)
4. CI/CD pipelines
5. Monitoring setup (Grafana)
6. Documentation

### Phase 6: Data Migration & Launch (Weeks 23-26)

1. Write data migration scripts (Supabase → new DB)
2. ID conversion (UUID → prefixed ULID)
3. Test migration on staging
4. Maintenance window for production migration
5. DNS cutover
6. Post-launch monitoring
7. Onboard existing tenants

---

## 29. Execution Timeline

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1-2 | Foundation | Monorepo, tooling, Docker, Drizzle schema |
| 3-4 | Foundation | NestJS skeleton, auth module, tenant middleware, RLS |
| 5-6 | Core API | Products, orders, checkout |
| 7-8 | Core API | Payments, fraud, tax, shipping |
| 9-10 | Multi-Tenant | Onboarding flow, SEO system |
| 11-12 | Multi-Tenant | Themes, domains, email config |
| 13-15 | Frontend | Storefront, component variants, theme injection |
| 16-18 | Frontend | Admin dashboard, checkout, platform site |
| 19-20 | Hardening | E2E tests, load tests, security audit |
| 21-22 | Hardening | CI/CD, monitoring, documentation |
| 23-24 | Migration | Data migration scripts, staging tests |
| 25-26 | Launch | Production migration, DNS cutover, monitoring |

---

## 30. Items Previously Missing from This Plan

The following items were identified as gaps after the initial draft and are now addressed:

### 30.1 CORS Configuration

The API must handle CORS carefully because requests come from multiple origins (each tenant's domain). The NestJS CORS config must dynamically allow origins based on registered tenant domains:

```typescript
// In main.ts
app.enableCors({
  origin: async (origin, callback) => {
    if (!origin) return callback(null, true); // Allow non-browser requests
    const isAllowed = await tenantDomainService.isRegisteredDomain(origin);
    callback(isAllowed ? null : new Error('CORS blocked'), isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID'],
});
```

### 30.2 Cart System Architecture

The current cart lives entirely in localStorage/sessionStorage (client-side). For the multi-tenant rebuild, cart remains client-side (no server-side cart table needed) with one key change: the cart key is scoped by tenant slug to prevent cross-tenant cart bleed:

```
Key: `sneakereco_cart_{tenant_slug}_{user_id || 'guest'}`
```

The `CartSnapshotService` (server-side cart backup for recovery) should be preserved and scoped per-tenant.

### 30.3 Image Processing Pipeline

The current system does background removal via Hugging Face/rembg and cropping via Sharp. In the new architecture:
- Image uploads go to R2 via the API
- A BullMQ job triggers post-upload processing (resize to standard dimensions, generate thumbnails, optional background removal)
- Sharp runs on the API droplet (no external service needed for resizing)
- Background removal: evaluate whether to keep rembg (requires Python sidecar) or drop it. If kept, run as a separate Docker container on the frontend droplet managed by Coolify.

### 30.4 Idempotency for Checkout

The checkout endpoint must be idempotent to prevent double-charges. The current system uses `idempotency_key` and `cart_hash` on the orders table. This pattern must be preserved:
- Frontend generates a UUID idempotency key before submitting checkout
- API checks `orders.idempotency_key` for duplicates before processing
- If duplicate found, return the existing order instead of creating a new one

### 30.5 Guest Checkout

Guest checkout must remain supported. Guests do not create a Cognito account. The flow:
1. Guest fills checkout form (email, shipping address, payment)
2. API creates order with `user_id = NULL`, `guest_email = 'customer@example.com'`
3. API generates an `order_access_token` and includes it in the confirmation email URL
4. Guest accesses order status via `/order-status/{id}?token={token}`

The API must handle unauthenticated checkout requests where `X-Tenant-ID` is provided but no `Authorization` header exists.

### 30.6 Webhook Security for Multi-Tenant

Each tenant has their own PayRilla and Shippo webhook secrets. The webhook endpoints must:
1. Receive the raw request body (do not parse JSON before signature verification)
2. Determine which tenant the webhook belongs to (from payload content, not headers)
3. Fetch that tenant's webhook secret from SSM
4. Verify HMAC signature against that specific tenant's secret
5. Process idempotently (check `webhook_events` table)

### 30.7 Database Connection Pooling Strategy

With two droplets (API + frontend) connecting to one managed PostgreSQL:
- API droplet: Pool of 10-20 connections via Drizzle's `pg` driver
- DO Managed PostgreSQL includes built-in PgBouncer for connection pooling
- Use `sneakereco_app` role for all application connections (RLS enforced)
- Use `sneakereco_system` role only for background jobs and migrations (RLS bypassed)
- Set `statement_timeout = '30s'` on `sneakereco_app` to prevent runaway queries

### 30.8 Data Backup & Disaster Recovery

- **Database:** DO Managed PostgreSQL automatic daily backups (7-day retention). Additionally, run `pg_dump` weekly to R2 as an off-site backup.
- **R2 Storage:** Cloudflare R2 has built-in redundancy. No additional backup needed.
- **Secrets:** Doppler maintains version history. SSM Parameter Store supports versioning.
- **Code:** GitHub is the source of truth. All infrastructure config is in code.

### 30.9 Rate Limiting Strategy

Three layers of rate limiting:

1. **Cloudflare WAF** -- Block obvious abuse at the edge (known bad IPs, rate limit by IP)
2. **Nginx** -- Per-IP rate limiting as a backup on the API droplet
3. **Application** -- Per-tenant + per-endpoint rate limiting via BullMQ rate limiter or `@nestjs/throttler`:
   - Auth endpoints: 5 requests/minute per IP
   - Checkout: 10 requests/minute per IP
   - Product listing: 60 requests/minute per IP
   - Admin endpoints: 120 requests/minute per user
   - Webhooks: 100 requests/minute per tenant

### 30.10 Tenant Suspension & Offboarding

The plan needs a mechanism for suspending or removing tenants:
- **Suspension:** Set `tenants.status = 'suspended'`. Tenant middleware returns 503 for all storefront requests. Admin dashboard still accessible with a banner. Orders in progress continue processing.
- **Reactivation:** Set status back to `active`.
- **Offboarding:** Data export via admin API (products, orders, customers as CSV). Then soft-delete tenant (status = `deleted`, data retained for 90 days per policy, then hard-deleted via cron job).

### 30.11 Logging Standardization

Every log line must include:
```json
{
  "level": "info",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "requestId": "req_01HXYZ...",
  "tenantId": "tnt_01HXYZ...",
  "userId": "usr_01HXYZ...",
  "module": "orders",
  "method": "createOrder",
  "duration": 245,
  "message": "Order created successfully",
  "orderId": "ord_01HXYZ..."
}
```

Use Pino as the logger (structured JSON, fast, NestJS integration via `nestjs-pino`).

### 30.12 Error Handling & Dead Letter Queue

Failed BullMQ jobs must not silently disappear:
- After max retries, jobs move to a dead letter queue
- A scheduled job checks the DLQ daily and logs/alerts
- Critical failures (payment webhook processing, order completion emails) trigger immediate alerts via email to platform admin

---

## Appendix A: Features Carried Forward from Current System

The following features exist in the current codebase (evidenced by the uploaded services) and must be reimplemented in the new architecture:

1. **Product Management** — Full CRUD with variants (size/price/stock), images, SKU generation, product duplication
2. **Product Catalog** — Brand/model taxonomy with aliases, fuzzy matching, candidate system for new brands
3. **Product Filters** — Faceted search by brand, model, size, condition, category
4. **Checkout** — Cart validation, pricing calculation (subtotal + shipping + tax), guest checkout
5. **Payment Processing** — PayRilla auth-only → NoFraud screening → capture/void, card tokenization, Apple Pay, Google Pay
6. **Order Management** — Status tracking, fulfillment workflow, refunds, order access tokens for guests
7. **Shipping** — Shippo integration (rate quotes, label purchase, tracking), carrier management, shipping defaults per category
8. **Tax Compliance** — ZipTax rate lookup with caching, nexus tracking per state, sales aggregation
9. **Fraud Prevention** — NoFraud transaction screening, chargeback evidence collection (payment, email, tracking, order snapshots)
10. **Email System** — Order confirmation, shipping updates (label created, in transit, delivered), pickup instructions, refund notification, admin alerts
11. **Contact System** — Contact form submissions with file attachments
12. **Newsletter** — Email subscriber management with double opt-in
13. **Featured Items** — Admin-curated product highlights with sort ordering
14. **Address Management** — Customer address book (shipping + billing), HERE Maps autocomplete + validation
15. **Admin Auth** — Role-based access (admin, owner), MFA enforcement
16. **Audit Trail** — Immutable event log for orders, payments, admin actions

## Appendix B: Features Being Removed

1. **Chat system** — Entirely removed. No chats, no chat messages, no realtime chat.
2. **In-app notifications** — Removed. Email notifications remain.
3. **Admin invites (old system)** — Replaced by tenant onboarding system.
4. **Marketplace abstraction** — Removed. Single-tenant-per-store model.
5. **Seller abstraction** — Removed. Each tenant is the seller.
6. **Stripe integration** — Completely removed. PayRilla only.
7. **Pageview analytics** — Removed from DB. Use Cloudflare Web Analytics.
8. **Tax rate cache in DB** — Moved to Valkey.
9. **PayRilla credentials in DB** — Moved to AWS SSM Parameter Store.

## Appendix C: PayRilla API Reference

See uploaded files:
- `API_SPEC.md` — Full OpenAPI spec for PayRilla gateway
- `HOSTED_TOKENIZATION.md` — Frontend tokenization library docs
- `WEBHOOKS.md` — Webhook event schemas
- `DIGITAL_WALLETS.md` — Apple Pay + Google Pay integration

Key PayRilla details for the implementor:
- Base URL: `https://api.payrillagateway.com/api/v2` (production)
- Auth: Basic auth (`source_key:pin` base64 encoded)
- Transaction IDs: Integer `reference_number` (store as string)
- Auth-only: Set `capture: false` on charge requests
- Capture: `POST /transactions/capture` with `reference_number`
- Void: `POST /transactions/void` with `reference_number`
- Refund: `POST /transactions/refund` with `reference_number` + optional `amount`
- Reversal: `POST /transactions/reversal` (auto-detect void vs refund)
- Webhook verification: HMAC-SHA256 of request body with endpoint secret key, compared to `X-Signature` header
- Hosted Tokenization: Load `tokenization.payrillagateway.com/tokenization/v0.3`, init with `pk_` tokenization key
- Nonce usage: Prefix nonce with `nonce-` in charge source field
- 3DS: Integrated via Paay, configured in Hosted Tokenization options

## Appendix D: Drizzle Schema Example

```typescript
// packages/db/src/schema/tenants.ts
import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),                    // tnt_<ULID>
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  domain: text('domain').unique(),
  email: text('email').notNull(),
  phone: text('phone'),
  instagram: text('instagram'),
  businessName: text('business_name'),
  businessType: text('business_type').default('reseller'),
  status: text('status').notNull().default('inactive'),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  opensAt: timestamp('opens_at', { withTimezone: true }),
  launchedAt: timestamp('launched_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

---

*End of Master Plan. This document should be fed to an AI coding assistant along with the uploaded schema, RLS, and PayRilla documentation for execution.*
