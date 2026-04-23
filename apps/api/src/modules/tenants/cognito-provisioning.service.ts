import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AssociateSoftwareTokenCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  InitiateAuthCommand,
  SetUserPoolMfaConfigCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import { CognitoClientProvider } from '../../core/cognito/cognito.client';
import { throwCognitoError } from '../../core/cognito/cognito-error.mapper';
import { getCognitoUserSub } from '../../core/cognito/cognito-user-sub';

export interface TenantPoolProvisioningResult {
  userPoolId: string;
  userPoolArn: string;
  customerClientId: string;
  region: string;
}

export interface ProvisionedTenantAdminSetup {
  secretCode: string;
  session: string;
}

@Injectable()
export class CognitoProvisioningService {
  private readonly region: string;
  private readonly sharedAdminPoolId: string;
  private readonly sesIdentityArn: string | undefined;
  private readonly tenantAdminClientId: string;

  constructor(
    private readonly cognitoClientProvider: CognitoClientProvider,
    config: ConfigService,
  ) {
    this.region = config.getOrThrow<string>('AWS_REGION');
    this.sharedAdminPoolId = config.getOrThrow<string>('PLATFORM_COGNITO_POOL_ID');
    this.sesIdentityArn = config.get<string>('SES_IDENTITY_ARN');
    this.tenantAdminClientId = config.getOrThrow<string>('PLATFORM_COGNITO_TENANT_ADMIN_CLIENT_ID');
  }

  private get client() {
    return this.cognitoClientProvider.client;
  }

  async createTenantCustomerPool(params: {
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
        Schema: [{ Name: 'email', AttributeDataType: 'String', Required: true, Mutable: true }],
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
        ExplicitAuthFlows: [
          'ALLOW_USER_PASSWORD_AUTH',
          'ALLOW_USER_AUTH',
          'ALLOW_REFRESH_TOKEN_AUTH',
        ],
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

    return {
      userPoolId,
      userPoolArn,
      customerClientId,
      region: this.region,
    };
  }

  async createTenantAdminUser(input: {
    email: string;
    fullName: string | null;
    password: string;
  }): Promise<string> {
    try {
      await this.client.send(
        new AdminCreateUserCommand({
          MessageAction: 'SUPPRESS',
          UserAttributes: [
            { Name: 'email', Value: input.email },
            { Name: 'email_verified', Value: 'true' },
            ...(input.fullName ? [{ Name: 'name', Value: input.fullName }] : []),
          ],
          UserPoolId: this.sharedAdminPoolId,
          Username: input.email,
        }),
      );

      await this.client.send(
        new AdminSetUserPasswordCommand({
          Password: input.password,
          Permanent: true,
          UserPoolId: this.sharedAdminPoolId,
          Username: input.email,
        }),
      );

      return getCognitoUserSub(this.client, {
        email: input.email,
        userPoolId: this.sharedAdminPoolId,
        missingSubMessage: 'Cognito user sub not found after creation',
      });
    } catch (error) {
      throwCognitoError(error);
    }
  }

  async beginTenantAdminSetup(credentials: {
    email: string;
    password: string;
  }): Promise<ProvisionedTenantAdminSetup> {
    try {
      const response = await this.client.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: this.tenantAdminClientId,
          AuthParameters: {
            USERNAME: credentials.email,
            PASSWORD: credentials.password,
          },
        }),
      );

      if (response.ChallengeName !== 'MFA_SETUP' || !response.Session) {
        throw new InternalServerErrorException(
          `Unexpected auth challenge during onboarding sign-in: ${response.ChallengeName}`,
        );
      }

      const associateResponse = await this.client.send(
        new AssociateSoftwareTokenCommand({ Session: response.Session }),
      );

      const session = associateResponse.Session ?? response.Session;

      if (!associateResponse.SecretCode || !session) {
        throw new InternalServerErrorException('Failed to start MFA setup for onboarding admin');
      }

      return {
        secretCode: associateResponse.SecretCode,
        session,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throwCognitoError(error);
    }
  }
}
