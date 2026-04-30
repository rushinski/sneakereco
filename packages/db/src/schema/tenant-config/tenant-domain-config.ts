import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const tenantDomainReadinessStateValues = [
  'not_configured',
  'pending_dns',
  'verified',
  'ssl_provisioning',
  'ready',
  'failed',
] as const;
export type TenantDomainReadinessState = (typeof tenantDomainReadinessStateValues)[number];

export const tenantDomainConfig = pgTable(
  'tenant_domain_config',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    subdomain: text('subdomain').notNull(),
    dnsVerificationToken: text('dns_verification_token'),
    cloudflareZoneId: text('cloudflare_zone_id'),
    storefrontCustomDomain: text('storefront_custom_domain'),
    storefrontReadinessState: text('storefront_readiness_state', {
      enum: tenantDomainReadinessStateValues,
    })
      .notNull()
      .default('not_configured'),
    storefrontVerifiedAt: timestamptz('storefront_verified_at'),
    storefrontReadyAt: timestamptz('storefront_ready_at'),
    storefrontFailureReason: text('storefront_failure_reason'),
    adminDomain: text('admin_domain'),
    adminReadinessState: text('admin_readiness_state', {
      enum: tenantDomainReadinessStateValues,
    })
      .notNull()
      .default('not_configured'),
    adminVerifiedAt: timestamptz('admin_verified_at'),
    adminReadyAt: timestamptz('admin_ready_at'),
    adminFailureReason: text('admin_failure_reason'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_tenant_domain_config_tenant').on(table.tenantId),
    uniqueIndex('uniq_tenant_domain_config_storefront_custom_domain').on(table.storefrontCustomDomain),
    uniqueIndex('uniq_tenant_domain_config_subdomain').on(table.subdomain),
    uniqueIndex('uniq_tenant_domain_config_admin_domain').on(table.adminDomain),
    index('idx_tenant_domain_custom')
      .on(table.storefrontCustomDomain)
      .where(sql`${table.storefrontCustomDomain} is not null`),
    index('idx_tenant_domain_subdomain').on(table.subdomain),
    check(
      'tenant_domain_storefront_state_check',
      sql`${table.storefrontReadinessState} in ('not_configured', 'pending_dns', 'verified', 'ssl_provisioning', 'ready', 'failed')`,
    ),
    check(
      'tenant_domain_admin_state_check',
      sql`${table.adminReadinessState} in ('not_configured', 'pending_dns', 'verified', 'ssl_provisioning', 'ready', 'failed')`,
    ),
  ],
);
