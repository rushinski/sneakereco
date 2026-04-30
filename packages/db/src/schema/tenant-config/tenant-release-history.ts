import { sql } from 'drizzle-orm';
import { check, index, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const tenantReleaseHistoryEventTypeValues = [
  'published',
  'scheduled',
  'rolled_back',
  'archived',
] as const;
export type TenantReleaseHistoryEventType = (typeof tenantReleaseHistoryEventTypeValues)[number];

export const tenantReleaseHistory = pgTable(
  'tenant_release_history',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    releaseSetId: text('release_set_id').notNull(),
    eventType: text('event_type', { enum: tenantReleaseHistoryEventTypeValues }).notNull(),
    actorAdminUserId: text('actor_admin_user_id'),
    summary: text('summary'),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index('idx_tenant_release_history_tenant').on(table.tenantId, table.createdAt.desc()),
    index('idx_tenant_release_history_release_set').on(table.releaseSetId),
    check(
      'tenant_release_history_event_type_check',
      sql`${table.eventType} in ('published', 'scheduled', 'rolled_back', 'archived')`,
    ),
  ],
);