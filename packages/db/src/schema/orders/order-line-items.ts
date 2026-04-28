import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';
import { productVariants } from '../catalog/product-variants';
import { products } from '../catalog/products';

import { orders } from './orders';

export const orderLineItems = pgTable(
  'order_line_items',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: text('product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    variantId: text('variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),
    productName: text('product_name').notNull(),
    brand: text('brand').notNull(),
    sizeLabel: text('size_label'),
    sku: text('sku').notNull(),
    imageUrl: text('image_url'),
    quantity: integer('quantity').notNull().default(1),
    unitPriceCents: integer('unit_price_cents').notNull(),
    lineTotalCents: integer('line_total_cents').notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index('idx_order_line_items_order').on(table.orderId),
    index('idx_order_line_items_tenant').on(table.tenantId),
    check('order_line_items_quantity_check', sql`${table.quantity} > 0`),
    check('order_line_items_unit_price_cents_check', sql`${table.unitPriceCents} >= 0`),
  ],
);
