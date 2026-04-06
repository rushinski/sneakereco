import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { createdAtColumn, timestamptz } from "../shared/columns";
import { tenants } from "../identity/tenants";
import { orders } from "../orders/orders";

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull(),
    externalEventId: text("external_event_id").notNull(),
    eventType: text("event_type").notNull(),
    payloadHash: text("payload_hash").notNull(),
    orderId: text("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    processedAt: timestamptz("processed_at").defaultNow(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("uniq_webhook_events_provider_external_event").on(
      table.provider,
      table.externalEventId,
    ),
    index("idx_webhook_events_order")
      .on(table.orderId)
      .where(sql`${table.orderId} is not null`),
  ],
).enableRLS();
