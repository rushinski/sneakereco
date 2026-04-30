import { Injectable } from '@nestjs/common';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

import { AuthConfig } from '../config/auth.config';

@Injectable()
export class CognitoAdminService {
  constructor(
    private readonly client: CognitoIdentityProviderClient,
    private readonly authConfig: AuthConfig,
  ) {}

  getAdminPoolIdentity() {
    return {
      userPoolId: this.authConfig.adminUserPoolId,
      platformAdminClientId: this.authConfig.platformAdminClientId,
      tenantAdminClientId: this.authConfig.tenantAdminClientId,
    };
  }

  getClient() {
    return this.client;
  }
}