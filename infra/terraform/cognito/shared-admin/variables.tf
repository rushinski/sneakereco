variable "environment" {
  description = "Deployment environment (development, staging, production)"
  type        = string
}

variable "platform_admin_group_name" {
  description = "Cognito group name for platform administrators"
  type        = string
  default     = "platform-admin"
}

variable "store_admin_group_name" {
  description = "Cognito group name for store administrators"
  type        = string
  default     = "store-admin"
}
