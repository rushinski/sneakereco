import { sql } from 'drizzle-orm';
import { check, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';

export const slotDefinitionSurfaceValues = ['page', 'auth_shell', 'email'] as const;

export const slotDefinitions = pgTable(
  'slot_definitions',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    surface: text('surface', { enum: slotDefinitionSurfaceValues }).notNull(),
    pageType: text('page_type'),
    displayName: text('display_name').notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_slot_definitions_key').on(table.key),
    check('slot_definitions_surface_check', sql`${table.surface} in ('page', 'auth_shell', 'email')`),
  ],
);