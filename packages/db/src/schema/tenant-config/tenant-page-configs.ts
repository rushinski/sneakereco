import { pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const tenantPageConfigs = pgTable('tenant_page_configs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  pageType: text('page_type').notNull(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});