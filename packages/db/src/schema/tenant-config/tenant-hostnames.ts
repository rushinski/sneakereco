import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex, boolean } from 'drizzle-orm/pg-core';

import { tenants } from '../identity/tenants';
import { createdAtColumn, updatedAtColumn } from '../shared/columns';

export const tenantHostnameSurfaceValues = [
  'platform',
  'platform-admin',
  'customer',
  'store-admin',
] as const;

export type TenantHostnameSurface = (typeof tenantHostnameSurfaceValues)[number];

export const tenantHostnameKindValues = [
  'platform',
  'managed',
  'admin-managed',
  'custom',
  'admin-custom',
  'alias',
] as const;

export type TenantHostnameKind = (typeof tenantHostnameKindValues)[number];

export const tenantHostnameStatusValues = ['active', 'disabled', 'pending_verification'] as const;

export type TenantHostnameStatus = (typeof tenantHostnameStatusValues)[number];

export const tenantHostnames = pgTable(
  'tenant_hostnames',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    hostname: text('hostname').notNull(),
    surface: text('surface', { enum: tenantHostnameSurfaceValues }).notNull(),
    hostKind: text('host_kind', { enum: tenantHostnameKindValues }).notNull(),
    isCanonical: boolean('is_canonical').notNull().default(false),
    redirectToHostname: text('redirect_to_hostname'),
    status: text('status', { enum: tenantHostnameStatusValues }).notNull().default('active'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_tenant_hostnames_hostname').on(table.hostname),
    index('idx_tenant_hostnames_tenant_surface').on(table.tenantId, table.surface),
    check('tenant_hostnames_hostname_lowercase', sql`${table.hostname} = lower(${table.hostname})`),
    check(
      'tenant_hostnames_surface_check',
      sql`${table.surface} in ('platform', 'platform-admin', 'customer', 'store-admin')`,
    ),
    check(
      'tenant_hostnames_host_kind_check',
      sql`${table.hostKind} in ('platform', 'managed', 'admin-managed', 'custom', 'admin-custom', 'alias')`,
    ),
    check(
      'tenant_hostnames_status_check',
      sql`${table.status} in ('active', 'disabled', 'pending_verification')`,
    ),
  ],
);
