import { sql } from 'drizzle-orm';
import { check, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';
import { tenantAuthShellConfigs } from './tenant-auth-shell-configs';

export const authPageTypeValues = [
  'login',
  'register',
  'forgot_password',
  'reset_password',
  'verify_email',
  'otp',
  'mfa',
] as const;

export const tenantAuthPageConfigs = pgTable('tenant_auth_page_configs', {
  id: text('id').primaryKey(),
  tenantAuthShellConfigId: text('tenant_auth_shell_config_id').notNull().references(() => tenantAuthShellConfigs.id, { onDelete: 'cascade' }),
  pageType: text('page_type', { enum: authPageTypeValues }).notNull(),
  designFamilyId: text('design_family_id').notNull(),
  slotAssignments: jsonb('slot_assignments').notNull(),
  content: jsonb('content').notNull(),
  requiredCapabilities: jsonb('required_capabilities').notNull(),
  previewState: jsonb('preview_state'),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
}, (table) => [
  check('tenant_auth_page_configs_page_type_check', sql`${table.pageType} in ('login', 'register', 'forgot_password', 'reset_password', 'verify_email', 'otp', 'mfa')`),
]);