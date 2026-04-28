import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { countryColumn, createdAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

import { orders } from './orders';

export const orderAddressTypeValues = ['shipping', 'billing'] as const;

export type OrderAddressType = (typeof orderAddressTypeValues)[number];

export const orderAddresses = pgTable(
  'order_addresses',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    addressType: text('address_type', { enum: orderAddressTypeValues }).notNull(),
    fullName: text('full_name'),
    phone: text('phone'),
    line1: text('line1').notNull(),
    line2: text('line2'),
    city: text('city').notNull(),
    state: text('state').notNull(),
    postalCode: text('postal_code').notNull(),
    country: countryColumn(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_order_addresses_order_type').on(table.orderId, table.addressType),
    index('idx_order_addresses_order').on(table.orderId),
    check('order_addresses_type_check', sql`${table.addressType} in ('shipping', 'billing')`),
  ],
);
