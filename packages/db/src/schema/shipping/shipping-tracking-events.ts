import { index, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz } from '../shared/columns';
import { tenants } from '../identity/tenants';
import { orders } from '../orders/orders';

export const shippingTrackingEvents = pgTable(
  'shipping_tracking_events',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    carrier: text('carrier').notNull(),
    trackingNumber: text('tracking_number').notNull(),
    eventTimestamp: timestamptz('event_timestamp').notNull(),
    status: text('status').notNull(),
    location: text('location'),
    description: text('description'),
    rawResponse: jsonb('raw_response'),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index('idx_shipping_tracking_order').on(table.orderId, table.eventTimestamp.desc()),
    index('idx_shipping_tracking_number').on(table.trackingNumber),
  ],
);
