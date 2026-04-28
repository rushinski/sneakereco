import { boolean, index, jsonb, pgTable, text, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { createdAtColumn, jsonbEmptyObject, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const tenantTaxSettings = pgTable(
  'tenant_tax_settings',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    isEnabled: boolean('is_enabled').notNull().default(false),
    homeState: varchar('home_state', { length: 2 }).notNull(),
    businessName: text('business_name'),
    taxCodeOverrides: jsonb('tax_code_overrides').notNull().default(jsonbEmptyObject),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_tenant_tax_settings_tenant').on(table.tenantId),
    index('idx_tenant_tax_settings_tenant').on(table.tenantId),
  ],
);
