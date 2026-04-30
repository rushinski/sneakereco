import { sql } from 'drizzle-orm';
import { check, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';

export const designFamilyStatusValues = ['active', 'deprecated'] as const;

export const designFamilies = pgTable(
  'design_families',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    status: text('status', { enum: designFamilyStatusValues }).notNull().default('active'),
    pageFamilyKey: text('page_family_key').notNull(),
    authFamilyKey: text('auth_family_key').notNull(),
    emailFamilyKey: text('email_family_key').notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_design_families_key').on(table.key),
    check('design_families_status_check', sql`${table.status} in ('active', 'deprecated')`),
  ],
);