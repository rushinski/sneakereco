import { pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';

export const componentVariantVersions = pgTable('component_variant_versions', {
  id: text('id').primaryKey(),
  componentVariantId: text('component_variant_id').notNull(),
  version: text('version').notNull(),
  designFamilyId: text('design_family_id').notNull(),
  schemaVersion: text('schema_version').notNull().default('1'),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});