import { index, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';
import { customerUsers } from '../identity/customer-users';

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    customerUserId: text('customer_user_id').references(() => customerUsers.id, {
      onDelete: 'set null',
    }),    name: text('name'),
    email: text('email').notNull(),
    subject: text('subject'),
    message: text('message').notNull(),
    source: text('source'),
    attachments: jsonb('attachments'),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index('idx_contact_messages_tenant').on(table.tenantId, table.createdAt.desc()),
    index('idx_contact_messages_email').on(table.email),
  ],
);
