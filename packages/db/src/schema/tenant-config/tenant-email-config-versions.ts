import { sql } from 'drizzle-orm';
import { check, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';
import { tenantEmailConfig } from './tenant-email-config';
import { configVersionStatusValues } from './tenant-theme-versions';

export const tenantEmailConfigVersions = pgTable('tenant_email_config_versions', {
  id: text('id').primaryKey(),
  tenantEmailConfigId: text('tenant_email_config_id').notNull().references(() => tenantEmailConfig.id, { onDelete: 'cascade' }),
  designFamilyId: text('design_family_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  status: text('status', { enum: configVersionStatusValues }).notNull().default('draft'),
  sections: jsonb('sections').notNull(),
  previewState: jsonb('preview_state'),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
}, (table) => [
  check('tenant_email_config_versions_status_check', sql`${table.status} in ('draft', 'published', 'scheduled', 'archived')`),
]);