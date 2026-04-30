import { Injectable, NotImplementedException } from '@nestjs/common';

export interface TenantCustomerIdentityProvisioningResult {
  userPoolId: string;
  userPoolArn: string;
  userPoolName: string;
  customerClientId: string;
  customerClientName: string;
  region: string;
}

export interface TenantAdminIdentityProvisioningResult {
  cognitoSub: string;
}

@Injectable()
export class TenantProvisioningGateway {
  async createCustomerPoolAndClient(_: {
    tenantId: string;
    slug: string;
  }): Promise<TenantCustomerIdentityProvisioningResult> {
    throw new NotImplementedException('Tenant customer pool/client provisioning is not wired yet');
  }

  async createTenantAdminIdentity(_: {
    tenantId: string;
    email: string;
    fullName: string;
  }): Promise<TenantAdminIdentityProvisioningResult> {
    throw new NotImplementedException('Tenant admin identity provisioning is not wired yet');
  }
}