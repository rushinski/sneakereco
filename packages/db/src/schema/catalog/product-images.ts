import { index, integer, pgTable, text, boolean } from "drizzle-orm/pg-core";

import { createdAtColumn } from "../shared/columns";
import { tenants } from "../identity/tenants";
import { products } from "./products";

export const productImages = pgTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("idx_product_images_product").on(
      table.productId,
      table.isPrimary.desc(),
      table.sortOrder,
    ),
  ],
);
