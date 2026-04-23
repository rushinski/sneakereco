import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

export const COGNITO_CLIENT = Symbol('COGNITO_CLIENT');

@Injectable()
export class CognitoClientProvider {
  readonly client: CognitoIdentityProviderClient;

  constructor(config: ConfigService) {
    this.client = new CognitoIdentityProviderClient({
      region: config.getOrThrow<string>('AWS_REGION'),
    });
  }
}
