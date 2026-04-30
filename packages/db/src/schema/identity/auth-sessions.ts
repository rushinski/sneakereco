import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';

import { adminUsers } from './admin-users';
import { customerUsers } from './customer-users';
import { tenants } from './tenants';

export const authSessionActorTypeValues = ['platform_admin', 'tenant_admin', 'customer'] as const;
export type AuthSessionActorType = (typeof authSessionActorTypeValues)[number];

export const authSessionStatusValues = ['active', 'revoked', 'expired', 'replaced'] as const;
export type AuthSessionStatus = (typeof authSessionStatusValues)[number];

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: text('id').primaryKey(),
    actorType: text('actor_type', { enum: authSessionActorTypeValues }).notNull(),
    adminUserId: text('admin_user_id').references(() => adminUsers.id, { onDelete: 'cascade' }),
    customerUserId: text('customer_user_id').references(() => customerUsers.id, {
      onDelete: 'cascade',
    }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    userPoolId: text('user_pool_id').notNull(),
    appClientId: text('app_client_id').notNull(),
    cognitoSub: text('cognito_sub').notNull(),
    deviceId: text('device_id').notNull(),
    sessionVersion: text('session_version').notNull(),
    refreshTokenFingerprint: text('refresh_token_fingerprint').notNull(),
    originJti: text('origin_jti').notNull(),
    status: text('status', { enum: authSessionStatusValues }).notNull().default('active'),
    issuedAt: timestamptz('issued_at').notNull(),
    expiresAt: timestamptz('expires_at').notNull(),
    lastSeenAt: timestamptz('last_seen_at'),
    lastRefreshAt: timestamptz('last_refresh_at'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    revokedAt: timestamptz('revoked_at'),
    revocationReason: text('revocation_reason'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_auth_sessions_refresh_fingerprint').on(table.refreshTokenFingerprint),
    index('idx_auth_sessions_actor').on(table.actorType, table.status),
    index('idx_auth_sessions_admin_user').on(table.adminUserId),
    index('idx_auth_sessions_customer_user').on(table.customerUserId),
    index('idx_auth_sessions_tenant').on(table.tenantId),
    index('idx_auth_sessions_cognito').on(table.cognitoSub, table.userPoolId),
    check(
      'auth_sessions_actor_type_check',
      sql`${table.actorType} in ('platform_admin', 'tenant_admin', 'customer')`,
    ),
    check(
      'auth_sessions_status_check',
      sql`${table.status} in ('active', 'revoked', 'expired', 'replaced')`,
    ),
    check(
      'auth_sessions_actor_identity_check',
      sql`(
        (${table.actorType} in ('platform_admin', 'tenant_admin') and ${table.adminUserId} is not null and ${table.customerUserId} is null)
        or
        (${table.actorType} = 'customer' and ${table.customerUserId} is not null and ${table.adminUserId} is null)
      )`,
    ),
  ],
);