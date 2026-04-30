import { sql } from 'drizzle-orm';
import { check, index, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const tenantReleaseSetStatusValues = ['draft', 'published', 'scheduled', 'archived'] as const;
export type TenantReleaseSetStatus = (typeof tenantReleaseSetStatusValues)[number];

export const tenantReleaseSets = pgTable(
  'tenant_release_sets',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    status: text('status', { enum: tenantReleaseSetStatusValues }).notNull().default('draft'),
    scheduledFor: timestamptz('scheduled_for'),
    publishedAt: timestamptz('published_at'),
    rolledBackFromReleaseSetId: text('rolled_back_from_release_set_id'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('idx_tenant_release_sets_tenant').on(table.tenantId, table.status),
    check(
      'tenant_release_sets_status_check',
      sql`${table.status} in ('draft', 'published', 'scheduled', 'archived')`,
    ),
  ],
);