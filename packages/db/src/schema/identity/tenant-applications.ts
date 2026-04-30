import { sql } from 'drizzle-orm';
import { check, index, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';

import { adminUsers } from './admin-users';
import { tenants } from './tenants';

export const tenantApplicationStatusValues = [
  'submitted',
  'under_review',
  'approved',
  'denied',
  'withdrawn',
] as const;
export type TenantApplicationStatus = (typeof tenantApplicationStatusValues)[number];

export const tenantApplications = pgTable(
  'tenant_applications',
  {
    id: text('id').primaryKey(),
    requestedByName: text('requested_by_name').notNull(),
    requestedByEmail: text('requested_by_email').notNull(),
    businessName: text('business_name').notNull(),
    instagramHandle: text('instagram_handle'),
    status: text('status', { enum: tenantApplicationStatusValues })
      .notNull()
      .default('submitted'),
    reviewedByAdminUserId: text('reviewed_by_admin_user_id').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamptz('reviewed_at'),
    denialReason: text('denial_reason'),
    approvedTenantId: text('approved_tenant_id').references(() => tenants.id, {
      onDelete: 'set null',
    }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('idx_tenant_applications_status').on(table.status),
    index('idx_tenant_applications_requested_email').on(table.requestedByEmail),
    check(
      'tenant_applications_status_check',
      sql`${table.status} in ('submitted', 'under_review', 'approved', 'denied', 'withdrawn')`,
    ),
  ],
);