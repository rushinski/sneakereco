import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';

import { tenants } from './tenants';

export const customerUserStatusValues = ['active', 'suspended', 'disabled'] as const;
export type CustomerUserStatus = (typeof customerUserStatusValues)[number];

export const customerUsers = pgTable(
  'customer_users',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    fullName: text('full_name'),
    cognitoSub: text('cognito_sub').notNull(),
    status: text('status', { enum: customerUserStatusValues }).notNull().default('active'),
    lastLoginAt: timestamptz('last_login_at'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_customer_users_tenant_email').on(table.tenantId, table.email),
    uniqueIndex('uniq_customer_users_tenant_cognito_sub').on(table.tenantId, table.cognitoSub),
    index('idx_customer_users_tenant').on(table.tenantId),
    check(
      'customer_users_status_check',
      sql`${table.status} in ('active', 'suspended', 'disabled')`,
    ),
  ],
);