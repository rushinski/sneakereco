CREATE TABLE "auth_subject_revocations" (
  "id" text PRIMARY KEY NOT NULL,
  "cognito_sub" text NOT NULL,
  "user_pool_id" text NOT NULL,
  "revoke_before" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "uniq_auth_subject_revocations_subject_pool"
  ON "auth_subject_revocations" ("cognito_sub", "user_pool_id");

CREATE INDEX "idx_auth_subject_revocations_subject_pool"
  ON "auth_subject_revocations" ("cognito_sub", "user_pool_id");

CREATE TABLE "auth_session_lineage_revocations" (
  "id" text PRIMARY KEY NOT NULL,
  "cognito_sub" text NOT NULL,
  "user_pool_id" text NOT NULL,
  "origin_jti" text NOT NULL,
  "surface_key" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "uniq_auth_session_lineage_revocations_lineage_surface"
  ON "auth_session_lineage_revocations" (
    "cognito_sub",
    "user_pool_id",
    "origin_jti",
    "surface_key"
  );

CREATE INDEX "idx_auth_session_lineage_revocations_subject_pool"
  ON "auth_session_lineage_revocations" ("cognito_sub", "user_pool_id");

CREATE INDEX "idx_auth_session_lineage_revocations_expires_at"
  ON "auth_session_lineage_revocations" ("expires_at");
