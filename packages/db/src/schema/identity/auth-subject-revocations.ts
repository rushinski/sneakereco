import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

import { createdAtColumn, timestamptz, updatedAtColumn } from "../shared/columns";

export const authSubjectRevocations = pgTable(
  "auth_subject_revocations",
  {
    id: text("id").primaryKey(),
    cognitoSub: text("cognito_sub").notNull(),
    userPoolId: text("user_pool_id").notNull(),
    revokeBefore: timestamptz("revoke_before").notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("uniq_auth_subject_revocations_subject_pool").on(
      table.cognitoSub,
      table.userPoolId,
    ),
    index("idx_auth_subject_revocations_subject_pool").on(
      table.cognitoSub,
      table.userPoolId,
    ),
  ],
);
