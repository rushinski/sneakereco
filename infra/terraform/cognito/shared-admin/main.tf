resource "aws_cognito_user_pool" "shared_admin" {
  name = "sneakereco-shared-admin-${var.environment}"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  mfa_configuration        = "ON"

  software_token_mfa_configuration {
    enabled = true
  }

  password_policy {
    minimum_length    = 12
    require_uppercase = true
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

resource "aws_cognito_user_pool_client" "platform_admin" {
  name                    = "platform-admin"
  user_pool_id            = aws_cognito_user_pool.shared_admin.id
  access_token_validity   = 30
  id_token_validity       = 30
  refresh_token_validity  = 1
  auth_session_validity   = 10
  enable_token_revocation = true

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"
  enable_propagate_additional_user_context_data = false

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

resource "aws_cognito_user_pool_client" "tenant_admin" {
  name                    = "tenant-admin"
  user_pool_id            = aws_cognito_user_pool.shared_admin.id
  access_token_validity   = 30
  id_token_validity       = 30
  refresh_token_validity  = 1
  auth_session_validity   = 10
  enable_token_revocation = true

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"
  enable_propagate_additional_user_context_data = false

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

resource "aws_cognito_user_group" "platform_admin" {
  name         = var.platform_admin_group_name
  user_pool_id = aws_cognito_user_pool.shared_admin.id
  description  = "Platform administrators with full system access"
}

resource "aws_cognito_user_group" "tenant_admin" {
  name         = var.tenant_admin_group_name
  user_pool_id = aws_cognito_user_pool.shared_admin.id
  description  = "Tenant administrators with tenant-scoped access"
}
