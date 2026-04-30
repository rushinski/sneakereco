import { sql } from 'drizzle-orm';
import { check, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';
import { tenantThemeConfig } from './tenant-theme-config';

export const configVersionStatusValues = ['draft', 'published', 'scheduled', 'archived'] as const;

export const tenantThemeVersions = pgTable('tenant_theme_versions', {
  id: text('id').primaryKey(),
  tenantThemeConfigId: text('tenant_theme_config_id').notNull().references(() => tenantThemeConfig.id, { onDelete: 'cascade' }),
  designFamilyId: text('design_family_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  status: text('status', { enum: configVersionStatusValues }).notNull().default('draft'),
  tokens: jsonb('tokens').notNull(),
  previewState: jsonb('preview_state'),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
}, (table) => [
  check('tenant_theme_versions_status_check', sql`${table.status} in ('draft', 'published', 'scheduled', 'archived')`),
]);