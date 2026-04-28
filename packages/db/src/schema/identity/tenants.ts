import { sql } from 'drizzle-orm';
import { boolean, check, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';

export const tenantStatusValues = ['active', 'inactive', 'suspended'] as const;

export type TenantStatus = (typeof tenantStatusValues)[number];

export const tenants = pgTable(
  'tenants',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    domain: text('domain'),
    email: text('email').notNull(),
    phone: text('phone'),
    instagram: text('instagram'),
    businessName: text('business_name'),
    businessType: text('business_type').default('reseller'),
    status: text('status', { enum: tenantStatusValues }).notNull().default('inactive'),
    onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
    opensAt: timestamptz('opens_at'),
    launchedAt: timestamptz('launched_at'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_tenants_slug').on(table.slug),
    uniqueIndex('uniq_tenants_domain').on(table.domain),
    index('idx_tenants_status').on(table.status),
    check('tenants_status_check', sql`${table.status} in ('active', 'inactive', 'suspended')`),
  ],
);
