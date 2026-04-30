import { Module } from '@nestjs/common';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

import { getAuthConfig } from '../config/auth.config';

import { CognitoAdminService } from './cognito-admin.service';
import { CognitoTenantFactoryService } from './cognito-tenant-factory.service';

@Module({
  providers: [
    {
      provide: CognitoIdentityProviderClient,
      useFactory: () => new CognitoIdentityProviderClient({}),
    },
    {
      provide: 'AUTH_CONFIG',
      useFactory: () => getAuthConfig(process.env),
    },
    {
      provide: CognitoAdminService,
      inject: [CognitoIdentityProviderClient, 'AUTH_CONFIG'],
      useFactory: (
        client: CognitoIdentityProviderClient,
        authConfig: ReturnType<typeof getAuthConfig>,
      ) => new CognitoAdminService(client, authConfig),
    },
    CognitoTenantFactoryService,
  ],
  exports: [CognitoAdminService, CognitoTenantFactoryService],
})
export class CognitoModule {}