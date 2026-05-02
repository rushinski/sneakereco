# RLS Coverage Audit

Generated: 2026-05-01

## Actor Model

### Current RLS helpers assume (`packages/db/src/schema/shared/rls.ts`):
- `current_setting('app.current_tenant_id', true)` — used for tenant scoping
- `current_setting('app.current_user_id', true)` — used for per-user scoping
- `current_setting('app.current_user_role', true)` compared to `'admin'` for tenant-admin check

### Required actor model (from auth platform spec):
| Setting | Values |
|---------|--------|
| `app.actor_type` | `platform_admin`, `tenant_admin`, `customer`, `system`, `worker` |
| `app.actor_id` | actor's primary key (UUID string) |
| `app.tenant_id` | tenant UUID for tenant-scoped ops; empty for platform actors |

### Gap:
The setting names are mismatched. The API must set `app.current_tenant_id`, `app.current_user_id`, and `app.current_user_role` today, but the architecture spec uses `app.tenant_id`, `app.actor_id`, `app.actor_type`.

**Resolution:** Rename the RLS helper SQL snippets in `rls.ts` to use the approved setting names. All existing `pgPolicy` calls reference these helper snippets indirectly, so renaming the exported SQL fragments updates all policies at once. The API-side connection setup must set the new names — this is a coordinated change that must land at the same time.

No database migration is needed for the RLS helper rename (the SQL functions live in the Drizzle schema, not as installed DB functions). A migration IS needed if we add new `pgPolicy` rows for tables that currently lack coverage.

---

## Per-Table Coverage

| Table | Scoping | Policy File | Policy Status | Action Required |
|-------|---------|-------------|---------------|-----------------|
| **identity/** | | | | |
| `tenants` | tenant | identity/policies.ts | covered | `tenants_select` restricts select to current tenant. |
| `customer_users` | tenant | identity/policies.ts | covered | select-own, admin-select, update-own. Missing insert (system-only) — justified: system role bypasses RLS. |
| `admin_users` | platform | identity/policies.ts | covered | select-own, update-own. Platform-admin and system bypass. |
| `admin_tenant_relationships` | tenant | identity/policies.ts | covered | Restrictive tenant isolation + permissive own/admin policies. |
| `tenant_applications` | platform | none | no-rls-justified | System/platform-admin only; system role uses BYPASSRLS. |
| `tenant_setup_invitations` | platform | none | no-rls-justified | Same as above. |
| `auth_sessions` | session | none | no-rls-justified | System/worker role with BYPASSRLS. |
| `auth_subject_revocations` | session | none | no-rls-justified | Same. |
| `auth_session_lineage_revocations` | session | none | no-rls-justified | Same. |
| `tenant_business_profiles` | tenant | none | **missing** | Add admin-manage + public-read policies. |
| **tenant-config/** | | | | |
| `tenant_cognito_config` | platform | none | no-rls-justified | Secret data; system role only. |
| `tenant_domain_config` | platform | tenant-config/policies.ts | covered | Admin-manage. Public read handled by system role in middleware. |
| `tenant_theme_config` | tenant | tenant-config/policies.ts | covered | Public-read + admin-manage. |
| `tenant_theme_versions` | tenant | none | **missing** | Add admin-manage policy. |
| `tenant_email_config` | tenant | tenant-config/policies.ts | covered | Admin-manage. |
| `tenant_email_config_versions` | tenant | none | **missing** | Add admin-manage policy. |
| `tenant_seo_config` | tenant | tenant-config/policies.ts | covered | Public-read + admin-manage. |
| `tenant_page_configs` | tenant | none | **missing** | Add public-read + admin-manage. |
| `tenant_page_config_versions` | tenant | none | **missing** | Add admin-manage. |
| `tenant_auth_page_configs` | tenant | none | **missing** | Add public-read + admin-manage. |
| `tenant_auth_shell_configs` | tenant | none | **missing** | Add public-read + admin-manage. |
| `tenant_release_sets` | tenant | none | **missing** | Add admin-manage + public-read (for published). |
| `tenant_release_history` | tenant | none | **missing** | Add admin-read policy. |
| `component_variants` | platform | none | no-rls-justified | Platform reference data; no tenant ownership. System role. |
| `component_variant_versions` | platform | none | no-rls-justified | Same. |
| `slot_definitions` | platform | none | no-rls-justified | Same. |
| `design_families` | platform | none | no-rls-justified | Same. |
| `preview_state_fixtures` | platform | none | no-rls-justified | Platform-admin only. |
| **catalog/** | | | | |
| `products` | tenant | catalog/policies.ts | covered | Public active-read + admin-all. |
| `product_variants` | tenant | catalog/policies.ts | covered | Public read through active product + admin-all. |
| `product_images` | tenant | catalog/policies.ts | covered | Same pattern. |
| `product_filters` | tenant | catalog/policies.ts | covered | Public-read + admin-manage. |
| `product_filter_entries` | tenant | catalog/policies.ts | covered | Public-read (via products join) + admin-manage. |
| `tag_brands` | tenant | catalog/policies.ts | covered | Public active-read + admin-manage. |
| `tag_models` | tenant | catalog/policies.ts | covered | Same. |
| `tag_aliases` | tenant | catalog/policies.ts | covered | Same. |
| **communications/** | | | | |
| `email_audit_log` | tenant | communications/policies.ts | covered | Admin-read. |
| `email_subscribers` | tenant | communications/policies.ts | covered | Public-insert + admin-manage. |
| `contact_messages` | tenant | communications/policies.ts | covered | Public-insert + admin-read. |
| **orders/** | | | | |
| `orders` | tenant | orders/policies.ts | covered | Admin-all + customer select/insert. |
| `order_line_items` | tenant | orders/policies.ts | covered | Admin-all + customer read via order join. |
| `order_addresses` | tenant | orders/policies.ts | covered | Admin-all + customer read via order join. |
| `order_access_tokens` | tenant | (inline) | no-rls-justified | Short-lived guest tokens; system only. |
| `payment_transactions` | tenant | orders/policies.ts | covered | Admin-read only. |
| **operations/** | | | | |
| `audit_events` | operational | operations/policies.ts | covered | Admin-read. Writes by system role. |
| `customer_addresses` | tenant | operations/policies.ts | covered | Customer self-manage + admin-read. |
| `chargeback_evidence` | tenant | operations/policies.ts | covered | Admin-read. |
| `featured_items` | tenant | operations/policies.ts | covered | Public-read + admin-manage. |
| `webhook_events` | tenant | (inline) | no-rls-justified | System writes only; inline `rlsEnabled`. |
| **shipping/** | | | | |
| `tenant_shipping_config` | tenant | shipping/policies.ts | covered | Admin-manage. |
| `shipping_tracking_events` | tenant | shipping/policies.ts | covered | Admin-read + customer read via order join. |
| **tax/** | | | | |
| `nexus_registrations` | tenant | tax/policies.ts | covered | Admin-manage. |
| `state_sales_tracking` | tenant | tax/policies.ts | covered | Admin-read. |
| `tenant_tax_settings` | tenant | tax/policies.ts | covered | Admin-manage. |

---

## Summary of Action Required

### RLS helper rename (rls.ts)
Change `app.current_tenant_id` → `app.tenant_id`, `app.current_user_id` → `app.actor_id`, `app.current_user_role = 'admin'` → `app.actor_type = 'tenant_admin'`. All policies update automatically.

### Missing policies to add (tenant-config/policies.ts)
- `tenant_business_profiles` — public-read (current tenant scope) + admin-manage
- `tenant_theme_versions` — admin-manage
- `tenant_email_config_versions` — admin-manage
- `tenant_page_configs` — public-read + admin-manage
- `tenant_page_config_versions` — admin-manage
- `tenant_auth_page_configs` — public-read + admin-manage
- `tenant_auth_shell_configs` — public-read + admin-manage
- `tenant_release_sets` — admin-manage + public-read for published sets
- `tenant_release_history` — admin-read
