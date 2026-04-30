import { index, integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';
import { products } from '../catalog/products';
import { tenants } from '../identity/tenants';
import { adminUsers } from '../identity/admin-users';

export const featuredItems = pgTable(
  'featured_items',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdByAdminUserId: text('created_by_admin_user_id').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_featured_items_tenant_product').on(table.tenantId, table.productId),
    index('idx_featured_items_tenant_sort').on(table.tenantId, table.sortOrder),
  ],
);
