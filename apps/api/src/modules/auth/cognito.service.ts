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
  AdminGetUserCommand,
  AssociateSoftwareTokenCommand,
  CognitoIdentityProviderClient,
  CognitoIdentityProviderServiceException,
  CodeMismatchException,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
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
  UsernameExistsException,
  UserNotConfirmedException,
  UserNotFoundException,
  VerifySoftwareTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';
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

type ClientType = 'customer' | 'admin';

@Injectable()
export class CognitoService {
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly customerClientId: string;
  private readonly adminClientId: string;

  constructor(private readonly config: ConfigService) {
    this.client = new CognitoIdentityProviderClient({
      region: config.getOrThrow<string>('AWS_REGION'),
    });
    this.userPoolId = config.getOrThrow<string>('COGNITO_USER_POOL_ID');
    this.customerClientId = config.getOrThrow<string>(
      'COGNITO_CUSTOMER_CLIENT_ID',
    );
    this.adminClientId = config.getOrThrow<string>('COGNITO_ADMIN_CLIENT_ID');
  }

  private getClientId(clientType: ClientType): string {
    return clientType === 'admin' ? this.adminClientId : this.customerClientId;
  }

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

  async signIn(dto: SignInDto) {
    try {
      const response = await this.client.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: this.getClientId(dto.clientType ?? 'customer'),
          AuthParameters: {
            USERNAME: dto.email,
            PASSWORD: dto.password,
          },
        }),
      );

      if (response.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
        return {
          type: 'mfa_required' as const,
          session: response.Session!,
        };
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

  async respondToMfaChallenge(dto: MfaChallengeDto) {
    try {
      const response = await this.client.send(
        new RespondToAuthChallengeCommand({
          ChallengeName: 'SOFTWARE_TOKEN_MFA',
          ClientId: this.getClientId(dto.clientType ?? 'customer'),
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
        throw new BadRequestException(
          'Invalid TOTP code — check your authenticator app',
        );
      }
      this.mapCognitoError(error);
    }
  }

  async setUserMfaPreference(
    accessToken: string,
    enabled: boolean,
  ): Promise<void> {
    try {
      await this.client.send(
        new SetUserMFAPreferenceCommand({
          AccessToken: accessToken,
          SoftwareTokenMfaSettings: {
            Enabled: enabled,
            PreferredMfa: enabled,
          },
        }),
      );
    } catch (error) {
      this.mapCognitoError(error);
    }
  }

  async signUp(dto: SignUpDto) {
    try {
      const response = await this.client.send(
        new SignUpCommand({
          ClientId: this.customerClientId,
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

  async confirmSignUp(dto: ConfirmEmailDto): Promise<void> {
    try {
      await this.client.send(
        new ConfirmSignUpCommand({
          ClientId: this.customerClientId,
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

  async resendConfirmationCode(dto: ResendConfirmationDto): Promise<void> {
    try {
      await this.client.send(
        new ResendConfirmationCodeCommand({
          ClientId: this.customerClientId,
          Username: dto.email,
        }),
      );
    } catch (error) {
      if (error instanceof LimitExceededException) {
        throw new BadRequestException(
          'Resend limit exceeded. Wait before requesting another code.',
        );
      }
      // Swallow UserNotFoundException — do not reveal if email exists
      if (error instanceof UserNotFoundException) return;
      this.mapCognitoError(error);
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    try {
      await this.client.send(
        new ForgotPasswordCommand({
          ClientId: this.customerClientId,
          Username: dto.email,
        }),
      );
    } catch (error) {
      // Swallow UserNotFoundException — never reveal if email exists
      if (error instanceof UserNotFoundException) return;
      if (error instanceof LimitExceededException) {
        throw new BadRequestException(
          'Request limit exceeded. Try again later.',
        );
      }
      this.mapCognitoError(error);
    }
  }

  async confirmForgotPassword(dto: ResetPasswordDto): Promise<void> {
    try {
      await this.client.send(
        new ConfirmForgotPasswordCommand({
          ClientId: this.customerClientId,
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

  async refreshTokens(dto: RefreshTokenDto) {
    try {
      const response = await this.client.send(
        new InitiateAuthCommand({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: this.getClientId(dto.clientType ?? 'customer'),
          AuthParameters: {
            REFRESH_TOKEN: dto.refreshToken,
          },
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

  async signOut(dto: SignOutDto): Promise<void> {
    try {
      await this.client.send(
        new GlobalSignOutCommand({ AccessToken: dto.accessToken }),
      );
    } catch (error) {
      this.mapCognitoError(error);
    }
  }

  async adminGetUser(email: string): Promise<string> {
    try {
      const response = await this.client.send(
        new AdminGetUserCommand({
          UserPoolId: this.userPoolId,
          Username: email,
        }),
      );

      const subAttr = response.UserAttributes?.find(
        (attr) => attr.Name === 'sub',
      );
      if (!subAttr?.Value) {
        throw new InternalServerErrorException(
          'Cognito user sub not found after confirmation',
        );
      }
      return subAttr.Value;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.mapCognitoError(error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async disableMfa(_dto: DisableMfaDto, accessToken: string): Promise<void> {
    await this.setUserMfaPreference(accessToken, false);
  }
}
