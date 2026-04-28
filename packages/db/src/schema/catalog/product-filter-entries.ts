import { index, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

import { productFilters } from './product-filters';
import { products } from './products';

export const productFilterEntries = pgTable(
  'product_filter_entries',
  {
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    filterId: text('filter_id')
      .notNull()
      .references(() => productFilters.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.filterId] }),
    index('idx_product_filter_entries_filter').on(table.filterId),
  ],
);
