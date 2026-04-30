import { sql } from 'drizzle-orm';
import { check, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';

export const componentVariantSurfaceValues = ['page', 'auth_shell', 'email'] as const;

export const componentVariants = pgTable(
  'component_variants',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    slotDefinitionId: text('slot_definition_id').notNull(),
    surface: text('surface', { enum: componentVariantSurfaceValues }).notNull(),
    displayName: text('display_name').notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    check('component_variants_surface_check', sql`${table.surface} in ('page', 'auth_shell', 'email')`),
  ],
);