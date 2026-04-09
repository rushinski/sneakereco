import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AddCustomAttributesCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  AssociateSoftwareTokenCommand,
  CognitoIdentityProviderClient,
  CognitoIdentityProviderServiceException,
  CodeMismatchException,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  ExpiredCodeException,
  ForgotPasswordCommand,
  GlobalSignOutCommand,
  InitiateAuthCommand,
  LimitExceededException,
  NotAuthorizedException,
  ResendConfirmationCodeCommand,
  RespondToAuthChallengeCommand,
  SetUserMFAPreferenceCommand,
  SignUpCommand,
  UpdateUserPoolCommand,
  UsernameExistsException,
  UserNotConfirmedException,
  UserNotFoundException,
  VerifySoftwareTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { AddPermissionCommand, LambdaClient } from '@aws-sdk/client-lambda';

import type { ConfirmEmailDto } from './dto/confirm-email.dto';
import type { DisableMfaDto } from './dto/disable-mfa.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { MfaChallengeDto } from './dto/mfa-challenge.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import type { ResendConfirmationDto } from './dto/resend-confirmation.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { SignInDto } from './dto/sign-in.dto';
import type { SignOutDto } from './dto/sign-out.dto';
import type { SignUpDto } from './dto/sign-up.dto';
import type { VerifyMfaDto } from './dto/verify-mfa.dto';

/** Credentials for a specific Cognito user pool + app client. */
export interface PoolCredentials {
  userPoolId: string;
  clientId: string;
}

export interface TenantPoolResult {
  userPoolId: string;
  userPoolArn: string;
  customerClientId: string;
  adminClientId: string;
}

@Injectable()
export class CognitoService {
  private readonly client: CognitoIdentityProviderClient;
  private readonly lambdaClient: LambdaClient;
  private readonly region: string;

  // Platform pool credentials (Jacob's dashboard only)
  private readonly platformPoolId: string;
  private readonly platformAdminClientId: string;

  constructor(private readonly config: ConfigService) {
    this.region = config.getOrThrow<string>('AWS_REGION');
    this.client = new CognitoIdentityProviderClient({ region: this.region });
    this.lambdaClient = new LambdaClient({ region: this.region });
    this.platformPoolId = config.getOrThrow<string>('PLATFORM_COGNITO_POOL_ID');
    this.platformAdminClientId = config.getOrThrow<string>('PLATFORM_COGNITO_ADMIN_CLIENT_ID');
  }

  // ---------------------------------------------------------------------------
  // Error mapping
  // ---------------------------------------------------------------------------

  private mapCognitoError(error: unknown): never {
    if (error instanceof NotAuthorizedException) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (error instanceof UserNotConfirmedException) {
      throw new BadRequestException(
        'Email not confirmed. Check your inbox or request a new code at POST /v1/auth/confirm/resend',
      );
    }
    if (error instanceof UserNotFoundException) {
      throw new NotFoundException('User not found');
    }
    if (error instanceof UsernameExistsException) {
      throw new ConflictException('An account with this email already exists');
    }
    if (error instanceof CodeMismatchException) {
      throw new BadRequestException('Invalid code');
    }
    if (error instanceof ExpiredCodeException) {
      throw new BadRequestException('Code has expired');
    }
    if (error instanceof LimitExceededException) {
      throw new BadRequestException('Request limit exceeded. Try again later.');
    }
    if (error instanceof CognitoIdentityProviderServiceException) {
      throw new InternalServerErrorException('Authentication service error');
    }
    throw error;
  }

  // ---------------------------------------------------------------------------
  // Sign-in / token operations (pool-aware)
  // ---------------------------------------------------------------------------

  /**
   * Sign in a user. Pass `pool` with the tenant's credentials for customer/admin
   * tenant auth. Omit `pool` only for platform dashboard sign-in.
   */
  async signIn(dto: SignInDto, pool?: PoolCredentials) {
    const clientId = pool?.clientId ?? this.platformAdminClientId;

    try {
      const response = await this.client.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: clientId,
          AuthParameters: {
            USERNAME: dto.email,
            PASSWORD: dto.password,
          },
        }),
      );

      if (response.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
        return { type: 'mfa_required' as const, session: response.Session! };
      }

      const result = response.AuthenticationResult!;
      return {
        type: 'tokens' as const,
        accessToken: result.AccessToken!,
        refreshToken: result.RefreshToken!,
        idToken: result.IdToken!,
        expiresIn: result.ExpiresIn!,
      };
    } catch (error) {
      if (error instanceof UserNotConfirmedException) {
        throw new BadRequestException(
          'Email not confirmed. Check your inbox or request a new code at POST /v1/auth/confirm/resend',
        );
      }
      if (error instanceof NotAuthorizedException) {
        throw new UnauthorizedException('Invalid email or password');
      }
      this.mapCognitoError(error);
    }
  }

  async respondToMfaChallenge(dto: MfaChallengeDto, pool?: PoolCredentials) {
    const clientId = pool?.clientId ?? this.platformAdminClientId;

    try {
      const response = await this.client.send(
        new RespondToAuthChallengeCommand({
          ChallengeName: 'SOFTWARE_TOKEN_MFA',
          ClientId: clientId,
          Session: dto.session,
          ChallengeResponses: {
            SOFTWARE_TOKEN_MFA_CODE: dto.mfaCode,
          },
        }),
      );

      const result = response.AuthenticationResult!;
      return {
        type: 'tokens' as const,
        accessToken: result.AccessToken!,
        refreshToken: result.RefreshToken!,
        idToken: result.IdToken!,
        expiresIn: result.ExpiresIn!,
      };
    } catch (error) {
      if (error instanceof CodeMismatchException) {
        throw new UnauthorizedException('Invalid MFA code');
      }
      this.mapCognitoError(error);
    }
  }

  async refreshTokens(dto: RefreshTokenDto, pool?: PoolCredentials) {
    const clientId = pool?.clientId ?? this.platformAdminClientId;

    try {
      const response = await this.client.send(
        new InitiateAuthCommand({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: clientId,
          AuthParameters: { REFRESH_TOKEN: dto.refreshToken },
        }),
      );

      const result = response.AuthenticationResult!;
      return {
        accessToken: result.AccessToken!,
        idToken: result.IdToken!,
        expiresIn: result.ExpiresIn!,
      };
    } catch (error) {
      if (error instanceof NotAuthorizedException) {
        throw new UnauthorizedException('Session expired. Please sign in again.');
      }
      this.mapCognitoError(error);
    }
  }

  // ---------------------------------------------------------------------------
  // MFA / token operations (access-token based — no pool ID needed)
  // ---------------------------------------------------------------------------

  async associateSoftwareToken(accessToken: string) {
    try {
      const response = await this.client.send(
        new AssociateSoftwareTokenCommand({ AccessToken: accessToken }),
      );
      return { secretCode: response.SecretCode! };
    } catch (error) {
      this.mapCognitoError(error);
    }
  }

  async verifySoftwareToken(accessToken: string, dto: VerifyMfaDto) {
    try {
      const response = await this.client.send(
        new VerifySoftwareTokenCommand({
          AccessToken: accessToken,
          UserCode: dto.mfaCode,
          FriendlyDeviceName: dto.deviceName,
        }),
      );
      return { status: response.Status };
    } catch (error) {
      if (error instanceof CodeMismatchException) {
        throw new BadRequestException('Invalid TOTP code — check your authenticator app');
      }
      this.mapCognitoError(error);
    }
  }

  async setUserMfaPreference(accessToken: string, enabled: boolean): Promise<void> {
    try {
      await this.client.send(
        new SetUserMFAPreferenceCommand({
          AccessToken: accessToken,
          SoftwareTokenMfaSettings: { Enabled: enabled, PreferredMfa: enabled },
        }),
      );
    } catch (error) {
      this.mapCognitoError(error);
    }
  }

  async signOut(dto: SignOutDto): Promise<void> {
    try {
      await this.client.send(new GlobalSignOutCommand({ AccessToken: dto.accessToken }));
    } catch (error) {
      this.mapCognitoError(error);
    }
  }

  async disableMfa(_dto: DisableMfaDto, accessToken: string): Promise<void> {
    await this.setUserMfaPreference(accessToken, false);
  }

  // ---------------------------------------------------------------------------
  // Customer self-service (require tenant pool credentials)
  // ---------------------------------------------------------------------------

  async signUp(dto: SignUpDto, pool: PoolCredentials) {
    try {
      const response = await this.client.send(
        new SignUpCommand({
          ClientId: pool.clientId,
          Username: dto.email,
          Password: dto.password,
          UserAttributes: [{ Name: 'email', Value: dto.email }],
        }),
      );
      return {
        userSub: response.UserSub!,
        userConfirmed: response.UserConfirmed ?? false,
      };
    } catch (error) {
      this.mapCognitoError(error);
    }
  }

  async confirmSignUp(dto: ConfirmEmailDto, pool: PoolCredentials): Promise<void> {
    try {
      await this.client.send(
        new ConfirmSignUpCommand({
          ClientId: pool.clientId,
          Username: dto.email,
          ConfirmationCode: dto.code,
        }),
      );
    } catch (error) {
      if (error instanceof CodeMismatchException) {
        throw new BadRequestException('Invalid confirmation code');
      }
      if (error instanceof ExpiredCodeException) {
        throw new BadRequestException(
          'Confirmation code expired. Request a new one at POST /v1/auth/confirm/resend',
        );
      }
      this.mapCognitoError(error);
    }
  }

  async resendConfirmationCode(dto: ResendConfirmationDto, pool: PoolCredentials): Promise<void> {
    try {
      await this.client.send(
        new ResendConfirmationCodeCommand({
          ClientId: pool.clientId,
          Username: dto.email,
        }),
      );
    } catch (error) {
      if (error instanceof LimitExceededException) {
        throw new BadRequestException('Resend limit exceeded. Wait before requesting another code.');
      }
      // Swallow UserNotFoundException — do not reveal if email exists
      if (error instanceof UserNotFoundException) return;
      this.mapCognitoError(error);
    }
  }

  async forgotPassword(dto: ForgotPasswordDto, pool: PoolCredentials): Promise<void> {
    try {
      await this.client.send(
        new ForgotPasswordCommand({
          ClientId: pool.clientId,
          Username: dto.email,
        }),
      );
    } catch (error) {
      // Swallow UserNotFoundException — never reveal if email exists
      if (error instanceof UserNotFoundException) return;
      if (error instanceof LimitExceededException) {
        throw new BadRequestException('Request limit exceeded. Try again later.');
      }
      this.mapCognitoError(error);
    }
  }

  async confirmForgotPassword(dto: ResetPasswordDto, pool: PoolCredentials): Promise<void> {
    try {
      await this.client.send(
        new ConfirmForgotPasswordCommand({
          ClientId: pool.clientId,
          Username: dto.email,
          ConfirmationCode: dto.code,
          Password: dto.newPassword,
        }),
      );
    } catch (error) {
      if (error instanceof CodeMismatchException) {
        throw new BadRequestException('Invalid reset code');
      }
      if (error instanceof ExpiredCodeException) {
        throw new BadRequestException(
          'Reset code expired. Request a new one at POST /v1/auth/forgot-password',
        );
      }
      this.mapCognitoError(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Admin user provisioning (tenant pool)
  // ---------------------------------------------------------------------------

  async adminGetUser(email: string, userPoolId: string): Promise<string> {
    try {
      const response = await this.client.send(
        new AdminGetUserCommand({ UserPoolId: userPoolId, Username: email }),
      );
      const subAttr = response.UserAttributes?.find((attr) => attr.Name === 'sub');
      if (!subAttr?.Value) {
        throw new InternalServerErrorException('Cognito user sub not found after creation');
      }
      return subAttr.Value;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.mapCognitoError(error);
    }
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
      this.mapCognitoError(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Tenant pool provisioning
  // ---------------------------------------------------------------------------

  async createTenantPool(params: {
    businessName: string;
    lambdaArn: string;
  }): Promise<TenantPoolResult> {
    // 1. Create the user pool
    const poolResponse = await this.client.send(
      new CreateUserPoolCommand({
        PoolName: params.businessName,
        // Email is the only sign-in alias
        UsernameAttributes: ['email'],
        // MFA: optional (authenticator app)
        MfaConfiguration: 'OPTIONAL',
        EnabledMfas: ['SOFTWARE_TOKEN_MFA'],
        // Account recovery via email
        AccountRecoverySetting: {
          RecoveryMechanisms: [
            { Name: 'verified_email', Priority: 1 },
            { Name: 'verified_phone_number', Priority: 2 },
          ],
        },
        // Email verification required
        AutoVerifiedAttributes: ['email'],
        // Don't remember devices
        DeviceConfiguration: {
          ChallengeRequiredOnNewDevice: false,
          DeviceOnlyRememberedOnUserPrompt: false,
        },
        // Cognito default password policy
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireUppercase: true,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireSymbols: false,
            TemporaryPasswordValidityDays: 7,
          },
        },
        // Attach Pre Token Generation Lambda (V2 trigger)
        LambdaConfig: {
          PreTokenGenerationConfig: {
            LambdaArn: params.lambdaArn,
            LambdaVersion: 'V2_0',
          },
        },
        Schema: [
          { Name: 'email', AttributeDataType: 'String', Required: true, Mutable: true },
        ],
      }),
    );

    const userPoolId = poolResponse.UserPool?.Id;
    const userPoolArn = poolResponse.UserPool?.Arn;
    if (!userPoolId || !userPoolArn) {
      throw new InternalServerErrorException('Failed to create Cognito user pool');
    }

    // 2. Add custom attributes
    await this.client.send(
      new AddCustomAttributesCommand({
        UserPoolId: userPoolId,
        CustomAttributes: [
          { Name: 'tenant_id', AttributeDataType: 'String', Mutable: false },
          { Name: 'role', AttributeDataType: 'String', Mutable: true },
          { Name: 'member_id', AttributeDataType: 'String', Mutable: true },
        ],
      }),
    );

    // 3. Create customer app client (30-day refresh)
    const customerClientResponse = await this.client.send(
      new CreateUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientName: 'customer',
        ExplicitAuthFlows: ['ALLOW_USER_PASSWORD_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
        AuthSessionValidity: 10,            // minutes
        RefreshTokenValidity: 30,           // days
        AccessTokenValidity: 60,            // minutes
        IdTokenValidity: 60,                // minutes
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

    // 4. Create admin app client (1-day refresh)
    const adminClientResponse = await this.client.send(
      new CreateUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientName: 'admin',
        ExplicitAuthFlows: ['ALLOW_USER_PASSWORD_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
        AuthSessionValidity: 10,            // minutes
        RefreshTokenValidity: 1,            // day
        AccessTokenValidity: 60,            // minutes
        IdTokenValidity: 60,                // minutes
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

    // 5. Grant Cognito permission to invoke the Lambda for this pool
    await this.lambdaClient.send(
      new AddPermissionCommand({
        FunctionName: params.lambdaArn,
        StatementId: `cognito-${userPoolId.replace(/_/g, '-')}`,
        Action: 'lambda:InvokeFunction',
        Principal: 'cognito-idp.amazonaws.com',
        SourceArn: userPoolArn,
      }),
    );

    return { userPoolId, userPoolArn, customerClientId, adminClientId };
  }
}
