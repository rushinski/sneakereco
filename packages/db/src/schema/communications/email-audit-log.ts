import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

import { createdAtColumn, timestamptz } from "../shared/columns";
import { tenants } from "../identity/tenants";
import { orders } from "../orders/orders";

export const emailDeliveryStatusValues = [
  "sent",
  "delivered",
  "bounced",
  "complained",
  "failed",
] as const;

export type EmailDeliveryStatus = (typeof emailDeliveryStatusValues)[number];

export const emailAuditLog = pgTable(
  "email_audit_log",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    orderId: text("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    emailType: text("email_type").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    subject: text("subject"),
    sesMessageId: text("ses_message_id"),
    templateData: jsonb("template_data"),
    deliveryStatus: text("delivery_status", { enum: emailDeliveryStatusValues })
      .notNull()
      .default("sent"),
    sentAt: timestamptz("sent_at").notNull().defaultNow(),
    deliveredAt: timestamptz("delivered_at"),
    openedAt: timestamptz("opened_at"),
  },
  (table) => [
    index("idx_email_audit_log_tenant").on(table.tenantId, table.sentAt.desc()),
    index("idx_email_audit_log_order")
      .on(table.orderId)
      .where(sql`${table.orderId} is not null`),
    check(
      "email_audit_log_delivery_status_check",
      sql`${table.deliveryStatus} in ('sent', 'delivered', 'bounced', 'complained', 'failed')`,
    ),
  ],
);
