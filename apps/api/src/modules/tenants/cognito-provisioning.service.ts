import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  SetUserPoolMfaConfigCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import { throwCognitoError } from '../auth/cognito/cognito-error.mapper';

export interface TenantPoolProvisioningResult {
  userPoolId: string;
  userPoolArn: string;
  customerClientId: string;
  adminClientId: string;
  region: string;
}

@Injectable()
export class CognitoProvisioningService {
  private readonly client: CognitoIdentityProviderClient;
  private readonly region: string;
  private readonly sesIdentityArn: string | undefined;

  constructor(config: ConfigService) {
    this.region = config.getOrThrow<string>('AWS_REGION');
    this.client = new CognitoIdentityProviderClient({ region: this.region });
    this.sesIdentityArn = config.get<string>('SES_IDENTITY_ARN');
  }

  async createTenantPool(params: {
    businessName: string;
    subdomain: string;
  }): Promise<TenantPoolProvisioningResult> {
    const poolResponse = await this.client.send(
      new CreateUserPoolCommand({
        PoolName: params.businessName,
        UsernameAttributes: ['email'],
        MfaConfiguration: 'OFF',
        AccountRecoverySetting: {
          RecoveryMechanisms: [{ Name: 'verified_email', Priority: 1 }],
        },
        AutoVerifiedAttributes: ['email'],
        DeviceConfiguration: {
          ChallengeRequiredOnNewDevice: false,
          DeviceOnlyRememberedOnUserPrompt: false,
        },
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireUppercase: true,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireSymbols: false,
            TemporaryPasswordValidityDays: 7,
          },
          SignInPolicy: {
            AllowedFirstAuthFactors: ['PASSWORD', 'EMAIL_OTP'],
          },
        },
        Schema: [
          { Name: 'email', AttributeDataType: 'String', Required: true, Mutable: true },
        ],
        ...(this.sesIdentityArn
          ? {
              EmailConfiguration: {
                EmailSendingAccount: 'DEVELOPER' as const,
                From: `no-reply@auth-${params.subdomain}.sneakereco.com`,
                SourceArn: this.sesIdentityArn,
              },
              VerificationMessageTemplate: {
                DefaultEmailOption: 'CONFIRM_WITH_CODE' as const,
                EmailMessage: 'Your verification code is {####}',
                EmailSubject: 'Verify your email address',
              },
            }
          : {}),
      }),
    );

    const userPoolId = poolResponse.UserPool?.Id;
    const userPoolArn = poolResponse.UserPool?.Arn;
    if (!userPoolId || !userPoolArn) {
      throw new InternalServerErrorException('Failed to create Cognito user pool');
    }

    await this.client.send(
      new SetUserPoolMfaConfigCommand({
        UserPoolId: userPoolId,
        MfaConfiguration: 'OPTIONAL',
        SoftwareTokenMfaConfiguration: { Enabled: true },
      }),
    );

    const customerClientResponse = await this.client.send(
      new CreateUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientName: 'customer',
        ExplicitAuthFlows: ['ALLOW_USER_PASSWORD_AUTH', 'ALLOW_USER_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
        AuthSessionValidity: 10,
        RefreshTokenValidity: 30,
        AccessTokenValidity: 60,
        IdTokenValidity: 60,
        TokenValidityUnits: {
          RefreshToken: 'days',
          AccessToken: 'minutes',
          IdToken: 'minutes',
        },
        PreventUserExistenceErrors: 'ENABLED',
        GenerateSecret: false,
      }),
    );

    const customerClientId = customerClientResponse.UserPoolClient?.ClientId;
    if (!customerClientId) {
      throw new InternalServerErrorException('Failed to create customer app client');
    }

    const adminClientResponse = await this.client.send(
      new CreateUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientName: 'admin',
        ExplicitAuthFlows: ['ALLOW_USER_PASSWORD_AUTH', 'ALLOW_USER_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
        AuthSessionValidity: 10,
        RefreshTokenValidity: 1,
        AccessTokenValidity: 60,
        IdTokenValidity: 60,
        TokenValidityUnits: {
          RefreshToken: 'days',
          AccessToken: 'minutes',
          IdToken: 'minutes',
        },
        PreventUserExistenceErrors: 'ENABLED',
        GenerateSecret: false,
      }),
    );

    const adminClientId = adminClientResponse.UserPoolClient?.ClientId;
    if (!adminClientId) {
      throw new InternalServerErrorException('Failed to create admin app client');
    }

    return {
      userPoolId,
      userPoolArn,
      customerClientId,
      adminClientId,
      region: this.region,
    };
  }

  async createAdminUser(
    input: { email: string; fullName: string | null; password: string },
    pool: { userPoolId: string },
  ): Promise<string> {
    try {
      await this.client.send(
        new AdminCreateUserCommand({
          MessageAction: 'SUPPRESS',
          UserAttributes: [
            { Name: 'email', Value: input.email },
            { Name: 'email_verified', Value: 'true' },
            ...(input.fullName ? [{ Name: 'name', Value: input.fullName }] : []),
          ],
          UserPoolId: pool.userPoolId,
          Username: input.email,
        }),
      );

      await this.client.send(
        new AdminSetUserPasswordCommand({
          Password: input.password,
          Permanent: true,
          UserPoolId: pool.userPoolId,
          Username: input.email,
        }),
      );

      return this.adminGetUser(input.email, pool.userPoolId);
    } catch (error) {
      throwCognitoError(error);
    }
  }

  async adminGetUser(email: string, userPoolId: string): Promise<string> {
    try {
      const response = await this.client.send(
        new AdminGetUserCommand({ UserPoolId: userPoolId, Username: email }),
      );
      const subAttribute = response.UserAttributes?.find((attribute) => attribute.Name === 'sub');

      if (!subAttribute?.Value) {
        throw new InternalServerErrorException('Cognito user sub not found after creation');
      }

      return subAttribute.Value;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throwCognitoError(error);
    }
  }
}
