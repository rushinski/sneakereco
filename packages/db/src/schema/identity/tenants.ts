import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';

export const tenantStatusValues = [
  'provisioning',
  'setup_pending',
  'active',
  'suspended',
  'deactivated',
  'provisioning_failed',
] as const;

export type TenantStatus = (typeof tenantStatusValues)[number];

export const tenants = pgTable(
  'tenants',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    email: text('email').notNull(),
    status: text('status', { enum: tenantStatusValues }).notNull().default('provisioning'),
    provisioningFailedAt: timestamptz('provisioning_failed_at'),
    provisioningFailureReason: text('provisioning_failure_reason'),
    setupCompletedAt: timestamptz('setup_completed_at'),
    launchedAt: timestamptz('launched_at'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_tenants_slug').on(table.slug),
    index('idx_tenants_status').on(table.status),
    check(
      'tenants_status_check',
      sql`${table.status} in ('provisioning', 'setup_pending', 'active', 'suspended', 'deactivated', 'provisioning_failed')`,
    ),
  ],
);