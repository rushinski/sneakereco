import { sql } from 'drizzle-orm';
import { index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    fullName: text('full_name'),
    cognitoSub: text('cognito_sub'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_users_email').on(table.email),
    uniqueIndex('uniq_users_cognito_sub')
      .on(table.cognitoSub)
      .where(sql`${table.cognitoSub} is not null`),
    index('idx_users_cognito_sub')
      .on(table.cognitoSub)
      .where(sql`${table.cognitoSub} is not null`),
  ],
);
