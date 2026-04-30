import { sql } from 'drizzle-orm';
import { boolean, check, index, pgTable, text } from 'drizzle-orm/pg-core';

import { countryColumn, createdAtColumn, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';
import { customerUsers } from '../identity/customer-users';

export const userAddressTypeValues = ['shipping', 'billing'] as const;

export type UserAddressType = (typeof userAddressTypeValues)[number];

export const customerAddresses = pgTable(
  'customer_addresses',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    customerUserId: text('customer_user_id')
      .notNull()
      .references(() => customerUsers.id, { onDelete: 'cascade' }),
    addressType: text('address_type', { enum: userAddressTypeValues }).notNull(),
    fullName: text('full_name'),
    phone: text('phone'),
    line1: text('line1').notNull(),
    line2: text('line2'),
    city: text('city').notNull(),
    state: text('state').notNull(),
    postalCode: text('postal_code').notNull(),
    country: countryColumn(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('idx_customer_addresses_customer').on(table.customerUserId),
    index('idx_customer_addresses_tenant').on(table.tenantId, table.customerUserId),
    check('user_addresses_type_check', sql`${table.addressType} in ('shipping', 'billing')`),
  ],
);
