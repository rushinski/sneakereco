import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import {
  createdAtColumn,
  timestamptz,
  updatedAtColumn,
} from "../shared/columns";
import { tenants } from "../identity/tenants";

export const emailSubscriberStatusValues = [
  "pending",
  "confirmed",
  "unsubscribed",
] as const;

export type EmailSubscriberStatus =
  (typeof emailSubscriberStatusValues)[number];

export const emailSubscribers = pgTable(
  "email_subscribers",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    source: text("source"),
    status: text("status", { enum: emailSubscriberStatusValues })
      .notNull()
      .default("pending"),
    confirmationToken: text("confirmation_token"),
    tokenExpiresAt: timestamptz("token_expires_at"),
    confirmedAt: timestamptz("confirmed_at"),
    unsubscribedAt: timestamptz("unsubscribed_at"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("uniq_email_subscribers_tenant_email").on(
      table.tenantId,
      table.email,
    ),
    index("idx_email_subscribers_tenant").on(table.tenantId),
    index("idx_email_subscribers_token")
      .on(table.confirmationToken)
      .where(sql`${table.confirmationToken} is not null`),
    check(
      "email_subscribers_status_check",
      sql`${table.status} in ('pending', 'confirmed', 'unsubscribed')`,
    ),
  ],
);
