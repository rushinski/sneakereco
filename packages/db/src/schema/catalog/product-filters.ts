import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const productFilterGroupValues = [
  'brand',
  'model',
  'size_shoe',
  'size_clothing',
  'size_custom',
  'size_none',
  'condition',
  'category',
  'designer_brand',
  'collab',
  'custom',
] as const;

export type ProductFilterGroup = (typeof productFilterGroupValues)[number];

export const productFilters = pgTable(
  'product_filters',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    groupKey: text('group_key', { enum: productFilterGroupValues }).notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_product_filters_tenant_label_group').on(
      table.tenantId,
      table.label,
      table.groupKey,
    ),
    index('idx_product_filters_tenant_group').on(table.tenantId, table.groupKey),
    check(
      'product_filters_group_key_check',
      sql`${table.groupKey} in (
        'brand', 'model',
        'size_shoe', 'size_clothing', 'size_custom', 'size_none',
        'condition', 'category',
        'designer_brand', 'collab', 'custom'
      )`,
    ),
  ],
);
