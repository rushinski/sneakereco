output "user_pool_id" {
  description = "Shared admin Cognito user pool ID"
  value       = aws_cognito_user_pool.shared_admin.id
}

output "platform_admin_client_id" {
  description = "Platform admin app client ID"
  value       = aws_cognito_user_pool_client.platform_admin.id
}

output "store_admin_client_id" {
  description = "Store admin app client ID"
  value       = aws_cognito_user_pool_client.store_admin.id
}
