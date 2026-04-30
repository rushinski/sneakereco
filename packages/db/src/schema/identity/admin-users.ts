import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';

export const adminUserTypeValues = ['platform_admin', 'tenant_scoped_admin'] as const;
export type AdminUserType = (typeof adminUserTypeValues)[number];

export const adminUserStatusValues = ['pending_setup', 'active', 'suspended', 'disabled'] as const;
export type AdminUserStatus = (typeof adminUserStatusValues)[number];

export const adminUsers = pgTable(
  'admin_users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    fullName: text('full_name'),
    cognitoSub: text('cognito_sub').notNull(),
    adminType: text('admin_type', { enum: adminUserTypeValues }).notNull(),
    status: text('status', { enum: adminUserStatusValues }).notNull().default('pending_setup'),
    lastLoginAt: timestamptz('last_login_at'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_admin_users_email').on(table.email),
    uniqueIndex('uniq_admin_users_cognito_sub').on(table.cognitoSub),
    index('idx_admin_users_type').on(table.adminType),
    check(
      'admin_users_admin_type_check',
      sql`${table.adminType} in ('platform_admin', 'tenant_scoped_admin')`,
    ),
    check(
      'admin_users_status_check',
      sql`${table.status} in ('pending_setup', 'active', 'suspended', 'disabled')`,
    ),
  ],
);