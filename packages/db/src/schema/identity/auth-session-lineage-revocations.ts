import { index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';

export const authSessionLineageRevocations = pgTable(
  'auth_session_lineage_revocations',
  {
    id: text('id').primaryKey(),
    cognitoSub: text('cognito_sub').notNull(),
    userPoolId: text('user_pool_id').notNull(),
    originJti: text('origin_jti').notNull(),
    surfaceKey: text('surface_key').notNull(),
    expiresAt: timestamptz('expires_at').notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_auth_session_lineage_revocations_lineage_surface').on(
      table.cognitoSub,
      table.userPoolId,
      table.originJti,
      table.surfaceKey,
    ),
    index('idx_auth_session_lineage_revocations_subject_pool').on(
      table.cognitoSub,
      table.userPoolId,
    ),
    index('idx_auth_session_lineage_revocations_expires_at').on(table.expiresAt),
  ],
);
