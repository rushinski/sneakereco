# SneakerEco

**Multi-tenant white label SaaS platform for sneaker resellers.**

SneakerEco powers fully custom-branded e-commerce storefronts for sneaker resellers — every store looks, feels, and operates as its own independent business. SneakerEco is invisible. Resellers get their own domain, their own brand, their own customer experience, backed by an infrastructure purpose-built for the sneaker resale industry.

> For the full product vision, see [`VISION.md`](./VISION.md).  
> For the implementation blueprint, see [`MASTER_PLAN.md`](./MASTER_PLAN.md).  
> For auth architecture decisions, see [`AUTH_PLAN.md`](./AUTH_PLAN.md).

---

## What This Repo Is

This is the SneakerEco monorepo. It contains the API, all frontend applications, the database schema, and shared packages. Every tenant storefront — regardless of their custom domain — is served from this single codebase.

---

## Architecture at a Glance

```
sneakereco/
├── apps/
│   ├── api/          # NestJS — REST API, business logic, background jobs (BullMQ)
│   ├── web/          # Next.js App Router — all tenant storefronts + admin dashboards
│   └── platform/     # Next.js App Router — sneakereco.com marketing & onboarding
├── packages/
│   ├── db/           # Drizzle ORM schema + migrations (schema only, no connection)
│   └── shared/       # Shared TypeScript types, constants, utilities
├── infra/            # Terraform — infrastructure as code
└── docker/           # Docker Compose, Caddyfile, local certs (gitignored)
```

**Routing model:** `apps/web` handles all tenant traffic. A request to `heatkings.test` and a request to `heatkings.sneakereco.test` both hit the same Next.js app — tenant identity is resolved at the middleware layer via hostname lookup.

**Admin dashboards** are served at either `admin.{tenant}.test` (custom domain tenants) or `{tenant}.sneakereco.test/admin` (subdomain tenants).

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | NestJS, TypeScript |
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Database | PostgreSQL 18, Drizzle ORM, Row-Level Security |
| Auth | AWS Cognito (single User Pool, separate admin/customer App Clients) |
| Cache | Valkey 9 (Redis-compatible) |
| Queues | BullMQ (backed by Valkey) |
| Email | AWS SES via nodemailer |
| Storage / CDN | Cloudflare R2 |
| Secrets | Doppler |
| Infrastructure | Terraform |
| Monorepo | pnpm 10 + Turborepo |
| Local Proxy | Caddy (Docker) |
| ID Generation | Prefixed ULIDs via `ulidx` |

---

## Key Architectural Constraints

These are locked decisions. Do not propose alternatives without a strong reason.

- **Zod only** for validation — no `class-validator`
- **`drizzle-kit migrate` only** — never `drizzle-kit push`
- **Prefixed ULIDs** generated app-side before insert (e.g. `usr_`, `ord_`, `tnt_`)
- **Money in cents** — never floats
- **`packages/db` is schema-only** — no connection/pool logic; that lives in `apps/api`
- **Three-layer architecture in the API:** controllers (HTTP only) → services (business logic) → repositories (all Drizzle queries)
- **No inline Drizzle queries in services** — all DB access goes through repositories
- **Dual-mode refresh token strategy:** same-site tenants use httpOnly cookie; custom domain tenants receive refresh token in response body (`SameSite=Strict` cookies are incompatible with cross-origin custom domain calls to `api.sneakereco.com`)
- **Cognito owns confirmed/unconfirmed state** — no corresponding DB column
- **`users` table row created at email confirmation**, not at signup
- **Shared types in `packages/shared` only** when consumed by more than one package
- **`BASE_DOMAIN` env var pattern** — single var (`sneakereco.test` / `sneakereco.com`) drives all domain logic with no code changes between environments

---

## Local Development

### Prerequisites

Install the following using winget (run terminal as Administrator):

```powershell
# Node.js 24
winget install OpenJS.NodeJS.LTS

# pnpm 10
winget install pnpm.pnpm

# Docker Desktop 28
winget install Docker.DockerDesktop

# Doppler CLI
winget install Doppler.dopplercli

# mkcert
winget install FiloSottile.mkcert
```

After installing Doppler, authenticate:

```powershell
doppler login
```

### Step 1 — Hosts File

Open `C:\Windows\System32\drivers\etc\hosts` **as Administrator** and add the following entries:

```
127.0.0.1  sneakereco.test
127.0.0.1  api.sneakereco.test
127.0.0.1  dashboard.sneakereco.test
127.0.0.1  heatkings.sneakereco.test
127.0.0.1  heatkings.test
127.0.0.1  admin.heatkings.test
```

Add a new line for each additional tenant slug you want to test locally.

### Step 2 — Generate & Trust Local Certificates

This is a **one-time setup**. Certificates are generated into `docker/certs/` (gitignored) and mounted into the Caddy container at startup.

Open a terminal **as Administrator** and run from the repo root:

```powershell
# Install mkcert's local CA into your system trust store
mkcert -install

# Generate wildcard certs covering all local domains
mkcert -cert-file docker/certs/sneakereco.test.pem -key-file docker/certs/sneakereco.test-key.pem `
  "sneakereco.test" "*.sneakereco.test" `
  "heatkings.test" "*.heatkings.test"
```

`mkcert -install` registers the local CA with the Windows Certificate Store. Chrome and Edge trust this automatically. **Firefox users:** open Firefox → Settings → Privacy & Security → View Certificates → Authorities → Import, then import the `rootCA.pem` from the path printed by `mkcert -CAROOT`.

Once certs exist in `docker/certs/`, Caddy will pick them up on startup — no browser warnings.

> **Adding a new test tenant later:** Re-run the `mkcert` cert generation command with the new domain appended, then restart the Docker stack (`pnpm infra:up`).

### Step 3 — Install, Migrate & Run

```powershell
# Install dependencies
pnpm install

# Start all local infrastructure (Postgres, Valkey, Mailpit, Caddy)
pnpm infra:up

# Run database migrations
make db-migrate

# (Optional) Open Drizzle Studio to browse the database
make db-studio

# Start all apps in watch mode
pnpm dev
```

### Local Endpoints

| Service | URL |
|---|---|
| Platform (marketing/onboarding) | `https://sneakereco.test` |
| API | `https://api.sneakereco.test` |
| Tenant storefront (subdomain) | `https://heatkings.sneakereco.test` |
| Tenant admin (subdomain) | `https://heatkings.sneakereco.test/admin` |
| Tenant storefront (custom domain) | `https://heatkings.test` |
| Tenant admin (custom domain) | `https://admin.heatkings.test` |
| Drizzle Studio | `https://local.drizzle.studio` |
| Mailpit (email preview) | `http://localhost:8025` |

All commands that require environment variables are prefixed with `doppler run --` under the hood. There are no `.env` files in this project.

---

## Environments

| | Local | Staging | Production |
|---|---|---|---|
| Platform | `https://sneakereco.test` | `https://staging.sneakereco.com` | `https://sneakereco.com` |
| API | `https://api.sneakereco.test` | `https://api.staging.sneakereco.com` | `https://api.sneakereco.com` |
| Tenant (subdomain) | `https://{slug}.sneakereco.test` | `https://{slug}.staging.sneakereco.com` | `https://{slug}.sneakereco.com` |
| Tenant (custom domain) | `https://{domain}.test` | — | `https://{domain}` |
| Tenant admin (subdomain) | `https://{slug}.sneakereco.test/admin` | `https://{slug}.staging.sneakereco.com/admin` | `https://{slug}.sneakereco.com/admin` |
| Tenant admin (custom domain) | `https://admin.{domain}.test` | — | `https://admin.{domain}` |

---

## Multi-Tenancy Model

Each tenant has:
- A slug (e.g. `heatkings`) used for the subdomain `heatkings.sneakereco.com`
- An optional custom domain (e.g. `heatkings.com`) — DNS managed via Cloudflare API
- An optional custom branded email (e.g. `support@heatkings.com`) — routed via SES
- An isolated data space enforced by PostgreSQL Row-Level Security
- Their own Cognito App Client instances (provisioned at onboarding)
- Full theme customization (colors, fonts, layout variants)

All tenant data lives in the same PostgreSQL database, isolated at the row level via RLS. The `sneakereco_app` DB role has RLS enforced; `sneakereco_system` bypasses it for platform-level operations.

---

## Testing & Code Quality

```bash
pnpm lint              # doppler run -- turbo lint
pnpm lint:fix          # eslint . --fix
pnpm format            # prettier --write .
pnpm format:check      # prettier --check .
pnpm typecheck         # doppler run -- turbo typecheck
pnpm test:unit         # doppler run -- turbo test:unit
pnpm test:integration  # doppler run -- turbo test:integration
```

---

## Infrastructure

Infrastructure is managed via Terraform in `infra/`. See that directory for environment-specific configurations.

Production stack runs on DigitalOcean:
- API server — Droplet, PM2 cluster, Nginx reverse proxy
- Frontend — Droplet running Coolify (Docker + Traefik)
- Database — Managed PostgreSQL 18
- Cache / Queues — Managed Valkey 9

See `MASTER_PLAN.md §22–23` for full CI/CD pipeline and infrastructure specs.
