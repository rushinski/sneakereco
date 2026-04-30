import { pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const tenantAuthShellConfigs = pgTable('tenant_auth_shell_configs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  shellKey: text('shell_key').notNull(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});