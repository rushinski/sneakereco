import { sql } from 'drizzle-orm';
import { check, index, inet, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';
import { orders } from '../orders/orders';

export const auditEventActorTypeValues = ['user', 'system', 'webhook', 'cron'] as const;

export type AuditEventActorType = (typeof auditEventActorTypeValues)[number];

export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    orderId: text('order_id').references(() => orders.id, {
      onDelete: 'set null',
    }),
    actorType: text('actor_type', { enum: auditEventActorTypeValues }).notNull(),
    actorId: text('actor_id'),
    eventType: text('event_type').notNull(),
    summary: text('summary'),
    metadata: jsonb('metadata'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index('idx_audit_events_tenant').on(table.tenantId, table.createdAt.desc()),
    index('idx_audit_events_order')
      .on(table.orderId, table.createdAt.desc())
      .where(sql`${table.orderId} is not null`),
    index('idx_audit_events_type').on(table.tenantId, table.eventType),
    index('idx_audit_events_actor')
      .on(table.actorId)
      .where(sql`${table.actorId} is not null`),
    check(
      'audit_events_actor_type_check',
      sql`${table.actorType} in ('user', 'system', 'webhook', 'cron')`,
    ),
  ],
);
