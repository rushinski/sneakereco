import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { Injectable } from '@nestjs/common';

import { CognitoAdminService } from '../../../core/cognito/cognito-admin.service';
import { CognitoTenantFactoryService } from '../../../core/cognito/cognito-tenant-factory.service';

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
  constructor(
    private readonly cognitoTenantFactoryService: CognitoTenantFactoryService,
    private readonly cognitoAdminService: CognitoAdminService,
  ) {}

  async createCustomerPoolAndClient(input: {
    tenantId: string;
    slug: string;
  }): Promise<TenantCustomerIdentityProvisioningResult> {
    const customerPool = await this.cognitoTenantFactoryService.provisionTenantCustomerPool({
      tenantId: input.tenantId,
      tenantSlug: input.slug,
      tenantDisplayName: input.slug,
    });

    return {
      userPoolId: customerPool.userPoolId,
      userPoolArn: customerPool.userPoolArn,
      userPoolName: `${input.slug}-customers`,
      customerClientId: customerPool.appClientId,
      customerClientName: `${input.slug}-customers-web`,
      region: customerPool.region,
    };
  }

  async createTenantAdminIdentity(input: {
    tenantId: string;
    email: string;
    fullName: string;
  }): Promise<TenantAdminIdentityProvisioningResult> {
        const adminPool = this.cognitoAdminService.getAdminPoolIdentity();
    const client = this.cognitoAdminService.getClient();

    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: adminPool.userPoolId,
        Username: input.email,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: input.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: input.fullName },
          { Name: 'custom:admin_type', Value: 'tenant_admin' },
          { Name: 'custom:tenant_id', Value: input.tenantId },
        ],
      }),
    );

    await client.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: adminPool.userPoolId,
        Username: input.email,
        UserAttributes: [
          { Name: 'custom:admin_type', Value: 'tenant_admin' },
          { Name: 'custom:tenant_id', Value: input.tenantId },
        ],
      }),
    );

    const user = await client.send(
      new AdminGetUserCommand({
        UserPoolId: adminPool.userPoolId,
        Username: input.email,
      }),
    );

    const cognitoSub = user.UserAttributes?.find((attribute) => attribute.Name === 'sub')?.Value;
    if (!cognitoSub) {
      throw new Error('tenant_admin_sub_missing');
    }

    return {
      cognitoSub,
    };
  }
}
