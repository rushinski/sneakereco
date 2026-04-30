import { sql } from 'drizzle-orm';
import { check, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';

export const previewStateFixtureSurfaceValues = ['page', 'auth', 'email', 'admin_shell'] as const;

export const previewStateFixtures = pgTable('preview_state_fixtures', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  surface: text('surface', { enum: previewStateFixtureSurfaceValues }).notNull(),
  stateKey: text('state_key').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
}, (table) => [
  check('preview_state_fixtures_surface_check', sql`${table.surface} in ('page', 'auth', 'email', 'admin_shell')`),
]);