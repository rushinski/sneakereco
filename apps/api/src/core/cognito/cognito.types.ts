export type CognitoClaimMap = {
  sub: string;
  iss: string;
  client_id: string;
  'cognito:groups'?: string[];
  'custom:admin_type'?: string;
  'custom:tenant_id'?: string;
  'custom:session_id'?: string;
  'custom:session_version'?: string;
};

export type CognitoAdminPoolIdentity = {
  userPoolId: string;
  platformAdminClientId: string;
  tenantAdminClientId: string;
};

export type TenantCustomerPoolProvisioningInput = {
  tenantId: string;
  tenantSlug: string;
  tenantDisplayName: string;
};

export type TenantCustomerPoolProvisioningResult = {
  userPoolId: string;
  userPoolArn: string;
  appClientId: string;
  region: string;
};