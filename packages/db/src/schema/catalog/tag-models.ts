import { index, boolean, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

import { tagBrands } from './tag-brands';

export const tagModels = pgTable(
  'tag_models',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    brandId: text('brand_id')
      .notNull()
      .references(() => tagBrands.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_tag_models_tenant_brand_label').on(
      table.tenantId,
      table.brandId,
      table.label,
    ),
    index('idx_tag_models_brand').on(table.brandId),
    index('idx_tag_models_tenant').on(table.tenantId),
  ],
);
