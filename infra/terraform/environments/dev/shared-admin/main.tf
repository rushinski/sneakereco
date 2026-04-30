terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "shared_admin_cognito" {
  source = "../../../cognito/shared-admin"

  environment             = "dev"
  platform_admin_group_name = "platform-admin"
  tenant_admin_group_name   = "tenant-admin"
}