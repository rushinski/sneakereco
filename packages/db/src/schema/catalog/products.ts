import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';
import { users } from '../identity/users';

export const productCategoryValues = [
  'sneakers',
  'clothing',
  'accessories',
  'electronics',
] as const;

export const productConditionValues = ['new', 'preowned'] as const;

export type ProductCategory = (typeof productCategoryValues)[number];
export type ProductCondition = (typeof productConditionValues)[number];

export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    brand: text('brand').notNull(),
    model: text('model'),
    category: text('category', { enum: productCategoryValues }).notNull(),
    condition: text('condition', { enum: productConditionValues }).notNull(),
    conditionNote: text('condition_note'),
    description: text('description'),
    sku: text('sku').notNull(),
    costCents: integer('cost_cents').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    isOutOfStock: boolean('is_out_of_stock').notNull().default(false),
    goLiveAt: timestamptz('go_live_at').notNull().defaultNow(),
    createdBy: text('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_products_tenant_sku').on(table.tenantId, table.sku),
    index('idx_products_tenant').on(table.tenantId),
    index('idx_products_tenant_active').on(table.tenantId, table.isActive, table.goLiveAt.desc()),
    index('idx_products_tenant_brand').on(table.tenantId, table.brand),
    index('idx_products_tenant_category').on(table.tenantId, table.category),
    index('idx_products_created_at').on(table.tenantId, table.createdAt.desc()),
    check(
      'products_category_check',
      sql`${table.category} in ('sneakers', 'clothing', 'accessories', 'electronics')`,
    ),
    check('products_condition_check', sql`${table.condition} in ('new', 'preowned')`),
    check('products_cost_cents_check', sql`${table.costCents} >= 0`),
    check('products_sku_format_check', sql`${table.sku} ~ '^[A-Z]{2,4}-[A-Z]{2,4}-\\d{5}$'`),
  ],
);
