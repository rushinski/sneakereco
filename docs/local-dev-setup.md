# Local Development Setup

This guide configures your machine so that the local dev environment mirrors production's hostname, cookie, CORS, and TLS behaviour as closely as possible.

---

## 1. Hosts File

Add the following entries to your hosts file:

**macOS / Linux** — `/etc/hosts`  
**Windows** — `C:\Windows\System32\drivers\etc\hosts` (open as Administrator)

```
127.0.0.1  api.sneakereco.test
127.0.0.1  web.sneakereco.test
127.0.0.1  admin.sneakereco.test
127.0.0.1  platform.sneakereco.test
127.0.0.1  heatkings.sneakereco.test
127.0.0.1  heatkings.test
127.0.0.1  admin.heatkings.test
```

**Why `.test` TLD?**  
`*.sneakereco.test` gives same-site subdomain behaviour that mirrors `*.sneakereco.com` in production, including `SameSite=Strict` cookie forwarding. `heatkings.test` simulates a tenant custom domain (cross-site to `api.sneakereco.test`) so cross-origin bugs are caught before production.

---

## 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in the blanks. The key dev-specific values are:

```bash
PLATFORM_URL=http://platform.sneakereco.test:3002
PLATFORM_DASHBOARD_URL=http://platform.sneakereco.test:3002
COOKIE_DOMAIN=.sneakereco.test
USE_HTTPS=false   # set to 'true' if you set up mkcert + Caddy (see §4)
```

> If you set up HTTPS (§4), switch the URLs to `https://` and drop the port numbers — Caddy handles port 443.

---

## 3. Docker Compose (Databases + Mail)

Start PostgreSQL, Valkey, and Mailpit:

```bash
cd docker
docker compose up -d
```

| Service  | Address                        | Purpose                        |
|----------|--------------------------------|--------------------------------|
| Postgres | `localhost:5432`               | Primary database               |
| Valkey   | `localhost:6379`               | Cache, rate-limit state, queues |
| Mailpit  | SMTP `localhost:1025`, UI at `http://localhost:8025` | Catches all outbound email in dev |

The init script (`docker/init-db.sql`) creates two database roles:
- `sneakereco_app` — subject to Row Level Security (used for all user-facing requests)
- `sneakereco_system` — bypasses RLS (`row_security = off`), used for migrations and background jobs

---

## 4. (Optional) Local HTTPS via mkcert + Caddy

Running HTTPS locally enables `Secure` cookie flags, `__Host-` cookie prefixes, HSTS, and CSP `upgrade-insecure-requests` — the same code paths used in production.

### 4a. Install mkcert

```bash
# macOS
brew install mkcert

# Ubuntu / Debian
sudo apt install mkcert

# Windows (chocolatey)
choco install mkcert
```

Trust the local CA:

```bash
mkcert -install
```

### 4b. Generate Certificates

From the repo root:

```bash
mkdir -p docker/certs

mkcert \
  -cert-file docker/certs/sneakereco.test.pem \
  -key-file  docker/certs/sneakereco.test-key.pem \
  "*.sneakereco.test" "sneakereco.test" \
  "*.heatkings.test"  "heatkings.test"
```

> The `docker/certs/` directory is git-ignored. Never commit private keys.

### 4c. Start Caddy

```bash
cd docker
docker compose --profile https up -d caddy
```

Caddy reads `docker/Caddyfile` and forwards:
- `https://api.sneakereco.test` → `localhost:3000`
- `https://web.sneakereco.test` → `localhost:3001`
- `https://admin.sneakereco.test` → `localhost:3001`
- `https://platform.sneakereco.test` → `localhost:3002`
- `https://heatkings.test` / `https://admin.heatkings.test` → `localhost:3001`

### 4d. Update Environment Variables for HTTPS

In `.env.local`:

```bash
PLATFORM_URL=https://platform.sneakereco.test
PLATFORM_DASHBOARD_URL=https://platform.sneakereco.test
COOKIE_DOMAIN=.sneakereco.test
USE_HTTPS=true
```

Frontend `NEXT_PUBLIC_API_BASE_URL`:
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.sneakereco.test
```

---

## 5. Running the Apps

```bash
# API (NestJS)
pnpm --filter @sneakereco/api dev      # → http://localhost:3000

# Web admin (Next.js)
pnpm --filter @sneakereco/web dev      # → http://localhost:3001

# Platform dashboard (Next.js)
pnpm --filter @sneakereco/platform dev # → http://localhost:3002
```

With hosts entries set, you can now access:
- API: `http://api.sneakereco.test:3000` (or `https://api.sneakereco.test` with Caddy)
- Platform: `http://platform.sneakereco.test:3002`
- Simulated tenant custom domain: `http://heatkings.test:3001`

---

## 6. Verifying the Setup

```bash
# Check the API is reachable
curl http://api.sneakereco.test:3000/v1/health

# Check security headers (with Caddy)
curl -I https://api.sneakereco.test/v1/health

# Confirm refresh token cookie attributes after sign-in
# Open browser DevTools → Application → Cookies → look for __sneakereco_refresh
# It should have: HttpOnly ✓, Secure ✓ (with HTTPS), SameSite=Strict, Path=/v1/auth
```
