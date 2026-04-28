import { jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import {
  countryColumn,
  createdAtColumn,
  jsonbEmptyObject,
  textEmptyArray,
  updatedAtColumn,
} from '../shared/columns';
import { tenants } from '../identity/tenants';

export const tenantShippingConfig = pgTable(
  'tenant_shipping_config',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    originName: text('origin_name').notNull(),
    originCompany: text('origin_company'),
    originPhone: text('origin_phone'),
    originLine1: text('origin_line1').notNull(),
    originLine2: text('origin_line2'),
    originCity: text('origin_city').notNull(),
    originState: text('origin_state').notNull(),
    originPostalCode: text('origin_postal_code').notNull(),
    originCountry: countryColumn('origin_country'),
    enabledCarriers: text('enabled_carriers').array().notNull().default(textEmptyArray),
    categoryDefaults: jsonb('category_defaults').notNull().default(jsonbEmptyObject),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex('uniq_tenant_shipping_config_tenant').on(table.tenantId)],
);
