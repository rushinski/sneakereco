-- Per-tenant Cognito user pools
-- Each tenant gets its own pool created programmatically on approval.
-- Super admin status is now implicit from the JWT issuer (platform pool URL).

CREATE TABLE tenant_cognito_config (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_pool_id text NOT NULL,
  user_pool_arn text NOT NULL,
  customer_client_id text NOT NULL,
  admin_client_id text NOT NULL,
  region text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_tenant_cognito_tenant UNIQUE (tenant_id),
  CONSTRAINT uniq_tenant_cognito_pool UNIQUE (user_pool_id)
);

ALTER TABLE users DROP COLUMN IF EXISTS is_super_admin;
