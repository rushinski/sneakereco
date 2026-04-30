output "user_pool_id" {
  description = "Shared admin Cognito user pool ID"
  value       = aws_cognito_user_pool.shared_admin.id
}

output "user_pool_arn" {
  description = "Shared admin Cognito user pool ARN"
  value       = aws_cognito_user_pool.shared_admin.arn
}

output "platform_admin_client_id" {
  description = "Platform admin app client ID"
  value       = aws_cognito_user_pool_client.platform_admin.id
}

output "tenant_admin_client_id" {
  description = "Tenant admin app client ID"
  value       = aws_cognito_user_pool_client.tenant_admin.id
}