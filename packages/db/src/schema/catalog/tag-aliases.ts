import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { createdAtColumn, updatedAtColumn } from "../shared/columns";
import { tenants } from "../identity/tenants";
import { tagBrands } from "./tag-brands";
import { tagModels } from "./tag-models";

export const tagAliasEntityTypeValues = ["brand", "model"] as const;

export type TagAliasEntityType = (typeof tagAliasEntityTypeValues)[number];

export const tagAliases = pgTable(
  "tag_aliases",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    entityType: text("entity_type", { enum: tagAliasEntityTypeValues })
      .notNull(),
    brandId: text("brand_id").references(() => tagBrands.id, {
      onDelete: "cascade",
    }),
    modelId: text("model_id").references(() => tagModels.id, {
      onDelete: "cascade",
    }),
    alias: text("alias").notNull(),
    priority: integer("priority").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("uniq_tag_aliases_tenant_entity_alias").on(
      table.tenantId,
      table.entityType,
      table.alias,
    ),
    index("idx_tag_aliases_brand")
      .on(table.brandId)
      .where(sql`${table.brandId} is not null`),
    index("idx_tag_aliases_model")
      .on(table.modelId)
      .where(sql`${table.modelId} is not null`),
    check(
      "tag_aliases_entity_type_check",
      sql`${table.entityType} in ('brand', 'model')`,
    ),
    check(
      "tag_aliases_entity_target_check",
      sql`(
        (${table.entityType} = 'brand' and ${table.brandId} is not null and ${table.modelId} is null)
        or
        (${table.entityType} = 'model' and ${table.modelId} is not null and ${table.brandId} is null)
      )`,
    ),
  ],
);
