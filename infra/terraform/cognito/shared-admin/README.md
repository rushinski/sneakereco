# Shared Admin Cognito Module

This module manages the Terraform-owned shared admin Cognito resources:

- shared admin user pool
- platform admin app client
- tenant admin app client
- admin groups

It does not manage tenant customer pools or clients. Those remain application-provisioned during tenant onboarding.