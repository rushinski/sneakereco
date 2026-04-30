import { Injectable } from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import type {
  TenantCustomerPoolProvisioningInput,
  TenantCustomerPoolProvisioningResult,
} from './cognito.types';

@Injectable()
export class CognitoTenantFactoryService {
  constructor(private readonly client: CognitoIdentityProviderClient) {}

  async provisionTenantCustomerPool(
    input: TenantCustomerPoolProvisioningInput,
  ): Promise<TenantCustomerPoolProvisioningResult> {
    const pool = await this.client.send(
      new CreateUserPoolCommand({
        PoolName: `${input.tenantSlug}-customers`,
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
        MfaConfiguration: 'OPTIONAL',
        Policies: {
          PasswordPolicy: {
            MinimumLength: 12,
            RequireLowercase: true,
            RequireUppercase: true,
            RequireNumbers: true,
            RequireSymbols: true,
          },
        },
        AdminCreateUserConfig: {
          AllowAdminCreateUserOnly: false,
        },
      }),
    );

    const userPoolId = pool.UserPool?.Id;
    const userPoolArn = pool.UserPool?.Arn;
    if (!userPoolId || !userPoolArn) {
      throw new Error('customer_pool_missing_identity');
    }

    const client = await this.client.send(
      new CreateUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientName: `${input.tenantSlug}-customers-web`,
        GenerateSecret: false,
        ExplicitAuthFlows: [
          'ALLOW_USER_PASSWORD_AUTH',
          'ALLOW_REFRESH_TOKEN_AUTH',
          'ALLOW_CUSTOM_AUTH',
        ],
      }),
    );

    const appClientId = client.UserPoolClient?.ClientId;
    if (!appClientId) {
      throw new Error('customer_client_missing_identity');
    }

    return {
      userPoolId,
      userPoolArn,
      appClientId,
      region: this.client.config.region?.toString() ?? 'us-east-1',
    };
  }
}