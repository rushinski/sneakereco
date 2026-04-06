import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

import { createdAtColumn, timestamptz } from "../shared/columns";
import { tenants } from "../identity/tenants";
import { orders } from "./orders";

export const orderAccessTokens = pgTable(
  "order_access_tokens",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    lastUsedAt: timestamptz("last_used_at"),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("uniq_order_access_tokens_token_hash").on(table.tokenHash),
    index("idx_order_access_tokens_order").on(table.orderId),
  ],
).enableRLS();
