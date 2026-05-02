# Schema Lifecycle Matrix

Generated: 2026-05-01

| Table | Status | Ownership | RLS Decision | Notes |
|-------|--------|-----------|--------------|-------|
| **identity/** | | | | |
| `users` | retire | — | — | Replaced by `admin_users` + `customer_users`. No new code should reference this. |
| `tenant_members` | retire | — | — | Replaced by `admin_tenant_relationships` + `customer_users`. |
| `admin_users` | active | platform-global | no-rls-justified | Platform-admin and system access only via `sneakereco_system` role. |
| `customer_users` | active | tenant-scoped | tenant-rls | RLS policies in `identity/policies.ts` cover select (own + tenant-admin) and update (own). |
| `admin_tenant_relationships` | active | platform-global | tenant-rls | Restrictive tenant isolation + permissive own/admin-select policies present. |
| `tenants` | active | platform-global | tenant-rls | `tenants_select` policy scopes to `current_tenant_id`. |
| `tenant_applications` | active | platform-global | no-rls-justified | Created and read by system/platform-admin only. |
| `tenant_setup_invitations` | active | platform-global | no-rls-justified | Created by platform-admin; consumed by system. |
| `auth_sessions` | active | auth-session | no-rls-justified | Accessed only via `sneakereco_system` role by worker/background jobs. |
| `auth_subject_revocations` | active | auth-session | no-rls-justified | System/worker only. |
| `auth_session_lineage_revocations` | active | auth-session | no-rls-justified | System/worker only. |
| **tenant-config/** | | | | |
| `tenant_onboarding` | retire | — | — | Replaced by `tenant_applications` + `tenant_setup_invitations`. |
| `tenant_cognito_config` | active | platform-global | no-rls-justified | Platform-admin and system only; contains secrets. |
| `tenant_domain_config` | active | platform-global | no-rls-justified | Read by all BFF middleware; no tenant-scoped data. |
| `tenant_business_profiles` | active | tenant-scoped | tenant-rls | Missing explicit policy — tenant-admin should read/write own; system can do all. |
| `tenant_theme_config` | transitional | tenant-scoped | tenant-rls | Missing explicit policy; superseded by versioned `tenant_theme_versions` but still active. |
| `tenant_theme_versions` | active | tenant-scoped | tenant-rls | Missing explicit policy; web-builder versioned theme resource. |
| `tenant_email_config` | transitional | tenant-scoped | tenant-rls | Missing explicit policy; superseded by `tenant_email_config_versions`. |
| `tenant_email_config_versions` | active | tenant-scoped | tenant-rls | Missing explicit policy. |
| `tenant_page_configs` | active | tenant-scoped | tenant-rls | Missing explicit policy. |
| `tenant_page_config_versions` | active | tenant-scoped | tenant-rls | Missing explicit policy. |
| `tenant_auth_page_configs` | active | tenant-scoped | tenant-rls | Missing explicit policy. |
| `tenant_auth_shell_configs` | active | tenant-scoped | tenant-rls | Missing explicit policy. |
| `tenant_seo_config` | active | tenant-scoped | tenant-rls | Missing explicit policy. |
| `tenant_shipping_config` | active | tenant-scoped | tenant-rls | Missing explicit policy in shipping/policies.ts — check. |
| `tenant_tax_settings` | active | tenant-scoped | tenant-rls | Check tax/policies.ts. |
| `tenant_release_sets` | active | tenant-scoped | tenant-rls | Missing explicit policy. |
| `tenant_release_history` | active | tenant-scoped | tenant-rls | Missing explicit policy. |
| `component_variants` | active | platform-global | public-read | Design-system reference data; no tenant ownership. |
| `component_variant_versions` | active | platform-global | public-read | Reference data. |
| `slot_definitions` | active | platform-global | public-read | Reference data. |
| `design_families` | active | platform-global | public-read | Reference data. |
| `preview_state_fixtures` | active | platform-global | platform-admin-only | Managed by platform. |
| **catalog/** | | | | |
| `products` | active | tenant-scoped | tenant-rls | catalog/policies.ts — verify coverage. |
| `product_variants` | active | tenant-scoped | tenant-rls | See catalog/policies.ts. |
| `product_images` | active | tenant-scoped | tenant-rls | See catalog/policies.ts. |
| `product_filters` | active | tenant-scoped | tenant-rls | See catalog/policies.ts. |
| `product_filter_entries` | active | tenant-scoped | tenant-rls | See catalog/policies.ts. |
| `tag_brands` | active | platform-global | public-read | Shared reference data. |
| `tag_models` | active | platform-global | public-read | Shared reference data. |
| `tag_aliases` | active | platform-global | public-read | Shared reference data. |
| **communications/** | | | | |
| `email_audit_log` | active | tenant-scoped | tenant-rls | See communications/policies.ts. |
| `email_subscribers` | active | tenant-scoped | tenant-rls | See communications/policies.ts. |
| `contact_messages` | active | tenant-scoped | tenant-rls | See communications/policies.ts. |
| **orders/** | | | | |
| `orders` | active | tenant-scoped | tenant-rls | See orders/policies.ts. |
| `order_line_items` | active | tenant-scoped | tenant-rls | See orders/policies.ts. |
| `order_addresses` | active | tenant-scoped | tenant-rls | See orders/policies.ts. |
| `order_access_tokens` | active | tenant-scoped | no-rls-justified | Short-lived guest tokens; accessed by system only. `rlsEnabled` + BYPASSRLS system role. |
| `payment_transactions` | active | tenant-scoped | tenant-rls | See orders/policies.ts. |
| **operations/** | | | | |
| `audit_events` | active | operational | no-rls-justified | Immutable write-only log; system role only. See operations/policies.ts. |
| `customer_addresses` | active | tenant-scoped | tenant-rls | See operations/policies.ts. |
| `chargeback_evidence` | active | tenant-scoped | tenant-rls | See operations/policies.ts. |
| `featured_items` | active | tenant-scoped | tenant-rls | See operations/policies.ts. |
| `webhook_events` | active | tenant-scoped | no-rls-justified | System writes; no tenant-scoped access needed. |
| **shipping/** | | | | |
| `tenant_shipping_config` | active | tenant-scoped | tenant-rls | See shipping/policies.ts. |
| `shipping_tracking_events` | active | tenant-scoped | tenant-rls | See shipping/policies.ts. |
| **tax/** | | | | |
| `nexus_registrations` | active | tenant-scoped | tenant-rls | See tax/policies.ts. |
| `state_sales_tracking` | active | tenant-scoped | tenant-rls | See tax/policies.ts. |
| `tenant_tax_settings` | active | tenant-scoped | tenant-rls | See tax/policies.ts. |
