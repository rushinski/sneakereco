import { sql } from 'drizzle-orm';
import { boolean, check, index, pgTable, text, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const nexusRegistrationTypeValues = ['physical', 'economic'] as const;

export type NexusRegistrationType = (typeof nexusRegistrationTypeValues)[number];

export const nexusRegistrations = pgTable(
  'nexus_registrations',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    stateCode: varchar('state_code', { length: 2 }).notNull(),
    registrationType: text('registration_type', {
      enum: nexusRegistrationTypeValues,
    }).notNull(),
    isRegistered: boolean('is_registered').notNull().default(false),
    registeredAt: timestamptz('registered_at'),
    trackingStartedAt: timestamptz('tracking_started_at'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_nexus_registrations_tenant_state').on(table.tenantId, table.stateCode),
    index('idx_nexus_registrations_tenant').on(table.tenantId),
    check(
      'nexus_registrations_type_check',
      sql`${table.registrationType} in ('physical', 'economic')`,
    ),
  ],
);
