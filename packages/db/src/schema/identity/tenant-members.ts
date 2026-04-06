import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { createdAtColumn, updatedAtColumn } from "../shared/columns";
import { tenants } from "./tenants";
import { users } from "./users";

export const tenantMemberRoleValues = ["customer", "admin"] as const;

export type TenantMemberRole = (typeof tenantMemberRoleValues)[number];

export const tenantMembers = pgTable(
  "tenant_members",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: tenantMemberRoleValues })
      .notNull()
      .default("customer"),
    isOwner: boolean("is_owner").notNull().default(false),
    isOrderEmailsEnabled: boolean("is_order_emails_enabled")
      .notNull()
      .default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("uniq_tenant_members_tenant_user").on(
      table.tenantId,
      table.userId,
    ),
    index("idx_tenant_members_tenant").on(table.tenantId),
    index("idx_tenant_members_user").on(table.userId),
    uniqueIndex("uniq_tenant_members_owner")
      .on(table.tenantId)
      .where(sql`${table.isOwner} = true`),
    check(
      "tenant_members_role_check",
      sql`${table.role} in ('customer', 'admin')`,
    ),
  ],
);
