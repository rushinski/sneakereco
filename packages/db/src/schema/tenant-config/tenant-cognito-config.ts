import { sql } from 'drizzle-orm';
import { check, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const tenantCognitoProvisioningStatusValues = ['pending', 'ready', 'failed'] as const;
export type TenantCognitoProvisioningStatus =
  (typeof tenantCognitoProvisioningStatusValues)[number];

export const tenantCognitoConfig = pgTable(
  'tenant_cognito_config',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userPoolId: text('user_pool_id').notNull(),
    userPoolArn: text('user_pool_arn').notNull(),
    userPoolName: text('user_pool_name').notNull(),
    customerClientId: text('customer_client_id').notNull(),
    customerClientName: text('customer_client_name').notNull(),
    region: text('region').notNull(),
    provisioningStatus: text('provisioning_status', {
      enum: tenantCognitoProvisioningStatusValues,
    })
      .notNull()
      .default('pending'),
    provisioningFailedAt: timestamptz('provisioning_failed_at'),
    provisioningFailureReason: text('provisioning_failure_reason'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_tenant_cognito_tenant').on(table.tenantId),
    uniqueIndex('uniq_tenant_cognito_pool').on(table.userPoolId),
    uniqueIndex('uniq_tenant_cognito_client').on(table.customerClientId),
    check(
      'tenant_cognito_provisioning_status_check',
      sql`${table.provisioningStatus} in ('pending', 'ready', 'failed')`,
    ),
  ],
);
