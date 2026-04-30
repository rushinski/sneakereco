import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';

import { adminUsers } from './admin-users';
import { tenants } from './tenants';

export const tenantSetupInvitationStatusValues = ['issued', 'consumed', 'expired', 'revoked'] as const;
export type TenantSetupInvitationStatus = (typeof tenantSetupInvitationStatusValues)[number];

export const tenantSetupInvitations = pgTable(
  'tenant_setup_invitations',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    adminUserId: text('admin_user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    status: text('status', { enum: tenantSetupInvitationStatusValues })
      .notNull()
      .default('issued'),
    sentAt: timestamptz('sent_at'),
    expiresAt: timestamptz('expires_at').notNull(),
    consumedAt: timestamptz('consumed_at'),
    revokedAt: timestamptz('revoked_at'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_tenant_setup_invitations_token_hash').on(table.tokenHash),
    index('idx_tenant_setup_invitations_admin').on(table.adminUserId),
    index('idx_tenant_setup_invitations_tenant').on(table.tenantId),
    check(
      'tenant_setup_invitations_status_check',
      sql`${table.status} in ('issued', 'consumed', 'expired', 'revoked')`,
    ),
  ],
);