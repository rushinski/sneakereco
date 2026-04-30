import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';

import { adminUsers } from './admin-users';
import { tenants } from './tenants';

export const adminTenantRelationshipTypeValues = ['tenant_admin'] as const;
export type AdminTenantRelationshipType = (typeof adminTenantRelationshipTypeValues)[number];

export const adminTenantRelationshipStatusValues = [
  'pending',
  'active',
  'suspended',
  'revoked',
] as const;
export type AdminTenantRelationshipStatus =
  (typeof adminTenantRelationshipStatusValues)[number];

export const adminTenantRelationships = pgTable(
  'admin_tenant_relationships',
  {
    id: text('id').primaryKey(),
    adminUserId: text('admin_user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    relationshipType: text('relationship_type', {
      enum: adminTenantRelationshipTypeValues,
    })
      .notNull()
      .default('tenant_admin'),
    status: text('status', { enum: adminTenantRelationshipStatusValues })
      .notNull()
      .default('pending'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_admin_tenant_relationships_admin_tenant').on(table.adminUserId, table.tenantId),
    uniqueIndex('uniq_admin_tenant_relationships_active_admin')
      .on(table.adminUserId)
      .where(sql`${table.status} = 'active'`),
    index('idx_admin_tenant_relationships_tenant').on(table.tenantId),
    check(
      'admin_tenant_relationships_type_check',
      sql`${table.relationshipType} in ('tenant_admin')`,
    ),
    check(
      'admin_tenant_relationships_status_check',
      sql`${table.status} in ('pending', 'active', 'suspended', 'revoked')`,
    ),
  ],
);