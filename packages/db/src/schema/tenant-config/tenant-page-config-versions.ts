import { sql } from 'drizzle-orm';
import { check, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';
import { tenantPageConfigs } from './tenant-page-configs';
import { configVersionStatusValues } from './tenant-theme-versions';

export const tenantPageConfigVersions = pgTable('tenant_page_config_versions', {
  id: text('id').primaryKey(),
  tenantPageConfigId: text('tenant_page_config_id').notNull().references(() => tenantPageConfigs.id, { onDelete: 'cascade' }),
  designFamilyId: text('design_family_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  status: text('status', { enum: configVersionStatusValues }).notNull().default('draft'),
  slotAssignments: jsonb('slot_assignments').notNull(),
  content: jsonb('content').notNull(),
  previewState: jsonb('preview_state'),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
}, (table) => [
  check('tenant_page_config_versions_status_check', sql`${table.status} in ('draft', 'published', 'scheduled', 'archived')`),
]);