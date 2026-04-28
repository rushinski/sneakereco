import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const tenantDomainConfig = pgTable(
  'tenant_domain_config',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    customDomain: text('custom_domain'),
    subdomain: text('subdomain').notNull(),
    dnsVerified: boolean('dns_verified').notNull().default(false),
    dnsVerificationToken: text('dns_verification_token'),
    dnsVerifiedAt: timestamptz('dns_verified_at'),
    sslProvisioned: boolean('ssl_provisioned').notNull().default(false),
    sslProvisionedAt: timestamptz('ssl_provisioned_at'),
    cloudflareZoneId: text('cloudflare_zone_id'),
    adminDomain: text('admin_domain'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_tenant_domain_config_tenant').on(table.tenantId),
    uniqueIndex('uniq_tenant_domain_config_custom_domain').on(table.customDomain),
    uniqueIndex('uniq_tenant_domain_config_subdomain').on(table.subdomain),
    index('idx_tenant_domain_custom')
      .on(table.customDomain)
      .where(sql`${table.customDomain} is not null`),
    index('idx_tenant_domain_subdomain').on(table.subdomain),
  ],
);
