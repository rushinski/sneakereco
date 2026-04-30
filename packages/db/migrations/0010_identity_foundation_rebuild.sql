-- Identity foundation rebuild scaffold.
-- This migration is intentionally additive-first:
-- it introduces the new identity/session/config tables and additive FK columns
-- without dropping the legacy users/tenant_members surfaces yet.

CREATE TABLE IF NOT EXISTS "admin_users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "full_name" text,
  "cognito_sub" text NOT NULL,
  "admin_type" text NOT NULL,
  "status" text DEFAULT 'pending_setup' NOT NULL,
  "last_login_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "admin_users_admin_type_check" CHECK ("admin_type" in ('platform_admin', 'tenant_scoped_admin')),
  CONSTRAINT "admin_users_status_check" CHECK ("status" in ('pending_setup', 'active', 'suspended', 'disabled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_admin_users_email" ON "admin_users" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_admin_users_cognito_sub" ON "admin_users" ("cognito_sub");
CREATE INDEX IF NOT EXISTS "idx_admin_users_type" ON "admin_users" ("admin_type");

CREATE TABLE IF NOT EXISTS "customer_users" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "email" text NOT NULL,
  "full_name" text,
  "cognito_sub" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "last_login_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "customer_users_status_check" CHECK ("status" in ('active', 'suspended', 'disabled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_customer_users_tenant_email"
  ON "customer_users" ("tenant_id", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_customer_users_tenant_cognito_sub"
  ON "customer_users" ("tenant_id", "cognito_sub");
CREATE INDEX IF NOT EXISTS "idx_customer_users_tenant" ON "customer_users" ("tenant_id");

CREATE TABLE IF NOT EXISTS "admin_tenant_relationships" (
  "id" text PRIMARY KEY NOT NULL,
  "admin_user_id" text NOT NULL REFERENCES "admin_users"("id") ON DELETE cascade,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "relationship_type" text DEFAULT 'tenant_admin' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "admin_tenant_relationships_type_check" CHECK ("relationship_type" in ('tenant_admin')),
  CONSTRAINT "admin_tenant_relationships_status_check" CHECK ("status" in ('pending', 'active', 'suspended', 'revoked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_admin_tenant_relationships_admin_tenant"
  ON "admin_tenant_relationships" ("admin_user_id", "tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_admin_tenant_relationships_active_admin"
  ON "admin_tenant_relationships" ("admin_user_id")
  WHERE "status" = 'active';
CREATE INDEX IF NOT EXISTS "idx_admin_tenant_relationships_tenant"
  ON "admin_tenant_relationships" ("tenant_id");

CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "actor_type" text NOT NULL,
  "admin_user_id" text REFERENCES "admin_users"("id") ON DELETE cascade,
  "customer_user_id" text REFERENCES "customer_users"("id") ON DELETE cascade,
  "tenant_id" text REFERENCES "tenants"("id") ON DELETE cascade,
  "user_pool_id" text NOT NULL,
  "app_client_id" text NOT NULL,
  "cognito_sub" text NOT NULL,
  "device_id" text NOT NULL,
  "session_version" text NOT NULL,
  "refresh_token_fingerprint" text NOT NULL,
  "origin_jti" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "issued_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "last_seen_at" timestamp with time zone,
  "last_refresh_at" timestamp with time zone,
  "ip_address" text,
  "user_agent" text,
  "revoked_at" timestamp with time zone,
  "revocation_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "auth_sessions_actor_type_check" CHECK ("actor_type" in ('platform_admin', 'tenant_admin', 'customer')),
  CONSTRAINT "auth_sessions_status_check" CHECK ("status" in ('active', 'revoked', 'expired', 'replaced'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_auth_sessions_refresh_fingerprint"
  ON "auth_sessions" ("refresh_token_fingerprint");
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_actor"
  ON "auth_sessions" ("actor_type", "status");
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_admin_user"
  ON "auth_sessions" ("admin_user_id");
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_customer_user"
  ON "auth_sessions" ("customer_user_id");
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_tenant"
  ON "auth_sessions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_cognito"
  ON "auth_sessions" ("cognito_sub", "user_pool_id");

CREATE TABLE IF NOT EXISTS "tenant_applications" (
  "id" text PRIMARY KEY NOT NULL,
  "requested_by_name" text NOT NULL,
  "requested_by_email" text NOT NULL,
  "business_name" text NOT NULL,
  "instagram_handle" text,
  "status" text DEFAULT 'submitted' NOT NULL,
  "reviewed_by_admin_user_id" text REFERENCES "admin_users"("id") ON DELETE set null,
  "reviewed_at" timestamp with time zone,
  "denial_reason" text,
  "approved_tenant_id" text REFERENCES "tenants"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_applications_status_check" CHECK ("status" in ('submitted', 'under_review', 'approved', 'denied', 'withdrawn'))
);

CREATE INDEX IF NOT EXISTS "idx_tenant_applications_status" ON "tenant_applications" ("status");
CREATE INDEX IF NOT EXISTS "idx_tenant_applications_requested_email" ON "tenant_applications" ("requested_by_email");

CREATE TABLE IF NOT EXISTS "tenant_setup_invitations" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "admin_user_id" text NOT NULL REFERENCES "admin_users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL,
  "status" text DEFAULT 'issued' NOT NULL,
  "sent_at" timestamp with time zone,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_setup_invitations_status_check" CHECK ("status" in ('issued', 'consumed', 'expired', 'revoked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_tenant_setup_invitations_token_hash"
  ON "tenant_setup_invitations" ("token_hash");
CREATE INDEX IF NOT EXISTS "idx_tenant_setup_invitations_admin"
  ON "tenant_setup_invitations" ("admin_user_id");
CREATE INDEX IF NOT EXISTS "idx_tenant_setup_invitations_tenant"
  ON "tenant_setup_invitations" ("tenant_id");

CREATE TABLE IF NOT EXISTS "tenant_business_profiles" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "business_name" text NOT NULL,
  "contact_name" text,
  "contact_email" text,
  "contact_phone" text,
  "instagram_handle" text,
  "logo_asset_id" text,
  "support_email" text,
  "support_phone" text,
  "location_summary" text,
  "footer_link_set" text,
  "social_links" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_tenant_business_profiles_tenant"
  ON "tenant_business_profiles" ("tenant_id");

CREATE TABLE IF NOT EXISTS "tenant_release_sets" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "scheduled_for" timestamp with time zone,
  "published_at" timestamp with time zone,
  "rolled_back_from_release_set_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_release_sets_status_check" CHECK ("status" in ('draft', 'published', 'scheduled', 'archived'))
);

CREATE INDEX IF NOT EXISTS "idx_tenant_release_sets_tenant"
  ON "tenant_release_sets" ("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "tenant_release_history" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "release_set_id" text NOT NULL,
  "event_type" text NOT NULL,
  "actor_admin_user_id" text,
  "summary" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_release_history_event_type_check" CHECK ("event_type" in ('published', 'scheduled', 'rolled_back', 'archived'))
);

CREATE INDEX IF NOT EXISTS "idx_tenant_release_history_tenant"
  ON "tenant_release_history" ("tenant_id", "created_at" desc);
CREATE INDEX IF NOT EXISTS "idx_tenant_release_history_release_set"
  ON "tenant_release_history" ("release_set_id");

CREATE TABLE IF NOT EXISTS "customer_addresses" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "customer_user_id" text NOT NULL REFERENCES "customer_users"("id") ON DELETE cascade,
  "address_type" text NOT NULL,
  "full_name" text,
  "phone" text,
  "line1" text NOT NULL,
  "line2" text,
  "city" text NOT NULL,
  "state" text NOT NULL,
  "postal_code" text NOT NULL,
  "country" text DEFAULT 'US' NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "customer_addresses_type_check" CHECK ("address_type" in ('shipping', 'billing'))
);

CREATE INDEX IF NOT EXISTS "idx_customer_addresses_customer"
  ON "customer_addresses" ("customer_user_id");
CREATE INDEX IF NOT EXISTS "idx_customer_addresses_tenant"
  ON "customer_addresses" ("tenant_id", "customer_user_id");

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_user_id" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "label_created_by_admin_user_id" text;
DO $$ BEGIN
  ALTER TABLE "orders"
    ADD CONSTRAINT "orders_customer_user_id_customer_users_id_fk"
    FOREIGN KEY ("customer_user_id") REFERENCES "customer_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "orders"
    ADD CONSTRAINT "orders_label_created_by_admin_user_id_admin_users_id_fk"
    FOREIGN KEY ("label_created_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "idx_orders_customer_user"
  ON "orders" ("customer_user_id", "created_at" desc)
  WHERE "customer_user_id" is not null;

ALTER TABLE "contact_messages" ADD COLUMN IF NOT EXISTS "customer_user_id" text;
DO $$ BEGIN
  ALTER TABLE "contact_messages"
    ADD CONSTRAINT "contact_messages_customer_user_id_customer_users_id_fk"
    FOREIGN KEY ("customer_user_id") REFERENCES "customer_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "created_by_admin_user_id" text;
DO $$ BEGIN
  ALTER TABLE "products"
    ADD CONSTRAINT "products_created_by_admin_user_id_admin_users_id_fk"
    FOREIGN KEY ("created_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "featured_items" ADD COLUMN IF NOT EXISTS "created_by_admin_user_id" text;
DO $$ BEGIN
  ALTER TABLE "featured_items"
    ADD CONSTRAINT "featured_items_created_by_admin_user_id_admin_users_id_fk"
    FOREIGN KEY ("created_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;