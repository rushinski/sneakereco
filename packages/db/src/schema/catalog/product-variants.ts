import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { createdAtColumn, updatedAtColumn } from "../shared/columns";
import { tenants } from "../identity/tenants";
import { products } from "./products";

export const productVariantSizeTypeValues = [
  "shoe",
  "clothing",
  "custom",
  "none",
] as const;

export type ProductVariantSizeType =
  (typeof productVariantSizeTypeValues)[number];

export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sizeType: text("size_type", { enum: productVariantSizeTypeValues })
      .notNull(),
    sizeLabel: text("size_label").notNull(),
    priceCents: integer("price_cents").notNull(),
    costCents: integer("cost_cents").notNull().default(0),
    stock: integer("stock").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("uniq_product_variants_product_size").on(
      table.productId,
      table.sizeType,
      table.sizeLabel,
    ),
    index("idx_product_variants_product").on(table.productId),
    index("idx_product_variants_tenant").on(table.tenantId),
    check(
      "product_variants_size_type_check",
      sql`${table.sizeType} in ('shoe', 'clothing', 'custom', 'none')`,
    ),
    check("product_variants_price_cents_check", sql`${table.priceCents} >= 0`),
    check("product_variants_cost_cents_check", sql`${table.costCents} >= 0`),
    check("product_variants_stock_check", sql`${table.stock} >= 0`),
  ],
);
