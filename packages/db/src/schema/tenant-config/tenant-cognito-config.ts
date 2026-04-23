import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

import { createdAtColumn, updatedAtColumn } from "../shared/columns";
import { tenants } from "../identity/tenants";

export const tenantCognitoConfig = pgTable(
  "tenant_cognito_config",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userPoolId: text("user_pool_id").notNull(),
    userPoolArn: text("user_pool_arn").notNull(),
    customerClientId: text("customer_client_id").notNull(),
    region: text("region").notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("uniq_tenant_cognito_tenant").on(table.tenantId),
    uniqueIndex("uniq_tenant_cognito_pool").on(table.userPoolId),
  ],
);
