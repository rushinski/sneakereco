import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdminListGroupsForUserCommand,
  AdminGetUserCommand,
  AssociateSoftwareTokenCommand,
  AdminUserGlobalSignOutCommand,
  CodeMismatchException,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ExpiredCodeException,
  ForgotPasswordCommand,
  GlobalSignOutCommand,
  InitiateAuthCommand,
  LimitExceededException,
  NotAuthorizedException,
  RevokeTokenCommand,
  ResendConfirmationCodeCommand,
  RespondToAuthChallengeCommand,
  SetUserMFAPreferenceCommand,
  SignUpCommand,
  UserNotConfirmedException,
  UserNotFoundException,
  VerifySoftwareTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import { CognitoClientProvider } from '../../../../core/cognito/cognito.client';
import { getCognitoUserSub } from '../../../../core/cognito/cognito-user-sub';
import type {
  LoginResult,
  OtpSentResult,
  OtpVerifyResult,
  RefreshResult,
  TokenResult,
} from '../../auth.types';
import { throwCognitoError } from '../../../../core/cognito/cognito-error.mapper';

import type { PoolCredentials } from './cognito.types';

@Injectable()
export class CognitoService {
  private readonly platformClientId: string;
  private readonly platformPoolId: string;

  constructor(
    private readonly cognitoClientProvider: CognitoClientProvider,
    config: ConfigService,
  ) {
    this.platformClientId = config.getOrThrow<string>('COGNITO_PLATFORM_ADMIN_CLIENT_ID');
    this.platformPoolId = config.getOrThrow<string>('COGNITO_POOL_ID');
  }

  private get client() {
    return this.cognitoClientProvider.client;
  }

  async login(
    credentials: { email: string; password: string },
    pool?: PoolCredentials,
  ): Promise<LoginResult> {
    const clientId = pool?.clientId ?? this.platformClientId;

    try {
      const response = await this.client.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: clientId,
          AuthParameters: {
            USERNAME: credentials.email,
            PASSWORD: credentials.password,
          },
        }),
      );

      if (response.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
        return { type: 'mfa_required', session: response.Session! };
      }

      if (response.ChallengeName === 'MFA_SETUP') {
        return { type: 'mfa_setup', session: response.Session!, email: credentials.email };
      }

      if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        throw new UnauthorizedException(
          'Account requires a password reset. Use the AWS console or CLI to set a permanent password before logging in.',
        );
      }

      if (response.ChallengeName) {
        throw new UnauthorizedException(`Unexpected auth challenge: ${response.ChallengeName}`);
      }

      return this.toTokenResult(response.AuthenticationResult);
    } catch (error) {
      if (error instanceof UserNotConfirmedException) {
        throw new BadRequestException(
          'Email not confirmed. Check your inbox or request a new code at POST /v1/auth/confirm/resend',
        );
      }
      if (error instanceof NotAuthorizedException) {
        throw new UnauthorizedException('Invalid email or password');
      }

      throwCognitoError(error);
    }
  }

  async respondToMfaChallenge(
    input: { email: string; session: string; mfaCode: string },
    pool?: PoolCredentials,
  ): Promise<TokenResult> {
    const clientId = pool?.clientId ?? this.platformClientId;

    try {
      const response = await this.client.send(
        new RespondToAuthChallengeCommand({
          ChallengeName: 'SOFTWARE_TOKEN_MFA',
          ClientId: clientId,
          Session: input.session,
          ChallengeResponses: {
            USERNAME: input.email,
            SOFTWARE_TOKEN_MFA_CODE: input.mfaCode,
          },
        }),
      );

      return this.toTokenResult(response.AuthenticationResult);
    } catch (error) {
      if (error instanceof CodeMismatchException) {
        throw new UnauthorizedException('Invalid MFA code');
      }

      throwCognitoError(error);
    }
  }

  async refreshTokens(refreshToken: string, pool?: PoolCredentials): Promise<RefreshResult> {
    const clientId = pool?.clientId ?? this.platformClientId;

    try {
      const response = await this.client.send(
        new InitiateAuthCommand({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: clientId,
          AuthParameters: { REFRESH_TOKEN: refreshToken },
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

      throwCognitoError(error);
    }
  }

  async associateSoftwareToken(accessToken: string): Promise<{ secretCode: string }> {
    try {
      const response = await this.client.send(
        new AssociateSoftwareTokenCommand({ AccessToken: accessToken }),
      );

      return { secretCode: response.SecretCode! };
    } catch (error) {
      throwCognitoError(error);
    }
  }

  async associateSoftwareTokenWithSession(
    session: string,
  ): Promise<{ secretCode: string; session: string }> {
    try {
      const response = await this.client.send(
        new AssociateSoftwareTokenCommand({ Session: session }),
      );

      return { secretCode: response.SecretCode!, session: response.Session! };
    } catch (error) {
      throwCognitoError(error);
    }
  }

  async completeMfaSetupChallenge(
    input: { email: string; session: string; mfaCode: string },
    pool?: PoolCredentials,
  ): Promise<TokenResult> {
    const clientId = pool?.clientId ?? this.platformClientId;

    try {
      const verifyResponse = await this.client.send(
        new VerifySoftwareTokenCommand({
          Session: input.session,
          UserCode: input.mfaCode,
          FriendlyDeviceName: 'Authenticator App',
        }),
      );

      if (verifyResponse.Status !== 'SUCCESS') {
        throw new UnauthorizedException('MFA code verification failed');
      }

      const challengeResponse = await this.client.send(
        new RespondToAuthChallengeCommand({
          ClientId: clientId,
          ChallengeName: 'MFA_SETUP',
          Session: verifyResponse.Session!,
          ChallengeResponses: { USERNAME: input.email },
        }),
      );

      return this.toTokenResult(challengeResponse.AuthenticationResult);
    } catch (error) {
      if (error instanceof CodeMismatchException) {
        throw new UnauthorizedException('Invalid TOTP code. Check your authenticator app.');
      }

      throwCognitoError(error);
    }
  }

  async verifySoftwareToken(
    accessToken: string,
    input: { mfaCode: string; deviceName?: string },
  ): Promise<{ status?: string }> {
    try {
      const response = await this.client.send(
        new VerifySoftwareTokenCommand({
          AccessToken: accessToken,
          UserCode: input.mfaCode,
          FriendlyDeviceName: input.deviceName,
        }),
      );

      return { status: response.Status };
    } catch (error) {
      if (error instanceof CodeMismatchException) {
        throw new BadRequestException('Invalid TOTP code. Check your authenticator app.');
      }

      throwCognitoError(error);
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
      throwCognitoError(error);
    }
  }

  async globalSignOut(accessToken: string): Promise<void> {
    try {
      await this.client.send(new GlobalSignOutCommand({ AccessToken: accessToken }));
    } catch (error) {
      throwCognitoError(error);
    }
  }

  async adminGlobalSignOut(username: string, userPoolId: string): Promise<void> {
    try {
      await this.client.send(
        new AdminUserGlobalSignOutCommand({
          UserPoolId: userPoolId,
          Username: username,
        }),
      );
    } catch (error) {
      throwCognitoError(error);
    }
  }

  async revokeToken(refreshToken: string, clientId: string): Promise<void> {
    try {
      await this.client.send(
        new RevokeTokenCommand({
          ClientId: clientId,
          Token: refreshToken,
        }),
      );
    } catch (error) {
      throwCognitoError(error);
    }
  }

  async signUp(
    input: { email: string; password: string },
    pool: PoolCredentials,
  ): Promise<{ userSub: string; userConfirmed: boolean }> {
    try {
      const response = await this.client.send(
        new SignUpCommand({
          ClientId: pool.clientId,
          Username: input.email,
          Password: input.password,
          UserAttributes: [{ Name: 'email', Value: input.email }],
        }),
      );

      return {
        userSub: response.UserSub!,
        userConfirmed: response.UserConfirmed ?? false,
      };
    } catch (error) {
      throwCognitoError(error);
    }
  }

  async confirmSignUp(
    input: { email: string; code: string },
    pool: PoolCredentials,
  ): Promise<void> {
    try {
      await this.client.send(
        new ConfirmSignUpCommand({
          ClientId: pool.clientId,
          Username: input.email,
          ConfirmationCode: input.code,
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

      throwCognitoError(error);
    }
  }

  async resendConfirmationCode(input: { email: string }, pool: PoolCredentials): Promise<void> {
    try {
      await this.client.send(
        new ResendConfirmationCodeCommand({
          ClientId: pool.clientId,
          Username: input.email,
        }),
      );
    } catch (error) {
      if (error instanceof LimitExceededException) {
        throw new BadRequestException(
          'Resend limit exceeded. Wait before requesting another code.',
        );
      }
      if (error instanceof UserNotFoundException) {
        return;
      }

      throwCognitoError(error);
    }
  }

  async forgotPassword(input: { email: string }, pool: PoolCredentials): Promise<void> {
    try {
      await this.client.send(
        new ForgotPasswordCommand({
          ClientId: pool.clientId,
          Username: input.email,
        }),
      );
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        return;
      }
      if (error instanceof LimitExceededException) {
        throw new BadRequestException('Request limit exceeded. Try again later.');
      }

      throwCognitoError(error);
    }
  }

  async confirmForgotPassword(
    input: { email: string; code: string; newPassword: string },
    pool: PoolCredentials,
  ): Promise<void> {
    try {
      await this.client.send(
        new ConfirmForgotPasswordCommand({
          ClientId: pool.clientId,
          Username: input.email,
          ConfirmationCode: input.code,
          Password: input.newPassword,
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

      throwCognitoError(error);
    }
  }

  async adminGetUser(email: string, userPoolId: string): Promise<string> {
    return getCognitoUserSub(this.client, { email, userPoolId });
  }

  async getUserGroups(email: string): Promise<string[]> {
    try {
      const response = await this.client.send(
        new AdminListGroupsForUserCommand({
          UserPoolId: this.platformPoolId,
          Username: email,
        }),
      );

      return response.Groups?.map((group) => group.GroupName).filter(Boolean) as string[];
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        return [];
      }

      throwCognitoError(error);
    }
  }

  async hasPlatformUser(email: string): Promise<boolean> {
    try {
      await this.client.send(
        new AdminGetUserCommand({
          UserPoolId: this.platformPoolId,
          Username: email,
        }),
      );

      return true;
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        return false;
      }

      throwCognitoError(error);
    }
  }

  async adminCheckMfaEnabled(username: string, userPoolId: string): Promise<boolean> {
    try {
      const response = await this.client.send(
        new AdminGetUserCommand({ UserPoolId: userPoolId, Username: username }),
      );

      return response.UserMFASettingList?.includes('SOFTWARE_TOKEN_MFA') ?? false;
    } catch (error) {
      throwCognitoError(error);
    }
  }

  async initiateEmailOtp(email: string, pool: PoolCredentials): Promise<OtpSentResult> {
    try {
      const response = await this.client.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_AUTH',
          ClientId: pool.clientId,
          AuthParameters: {
            USERNAME: email,
            PREFERRED_CHALLENGE: 'EMAIL_OTP',
          },
        }),
      );

      if (response.ChallengeName !== 'EMAIL_OTP') {
        throw new BadRequestException('Unexpected challenge during OTP initiation');
      }

      return { type: 'otp_sent', session: response.Session! };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof UserNotFoundException) {
        // Don't reveal whether the account exists
        return { type: 'otp_sent', session: '' };
      }
      throwCognitoError(error);
    }
  }

  async respondToEmailOtp(
    input: { email: string; session: string; code: string },
    pool: PoolCredentials,
  ): Promise<OtpVerifyResult> {
    try {
      const response = await this.client.send(
        new RespondToAuthChallengeCommand({
          ChallengeName: 'EMAIL_OTP',
          ClientId: pool.clientId,
          Session: input.session,
          ChallengeResponses: {
            USERNAME: input.email,
            EMAIL_OTP_CODE: input.code,
          },
        }),
      );

      if (response.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
        return { type: 'mfa_required', session: response.Session! };
      }

      return this.toTokenResult(response.AuthenticationResult);
    } catch (error) {
      if (error instanceof CodeMismatchException) {
        throw new UnauthorizedException('Invalid or expired OTP code');
      }
      throwCognitoError(error);
    }
  }

  private toTokenResult(
    result:
      | {
          AccessToken?: string;
          RefreshToken?: string;
          IdToken?: string;
          ExpiresIn?: number;
        }
      | undefined,
  ): TokenResult {
    return {
      type: 'tokens',
      accessToken: result!.AccessToken!,
      refreshToken: result!.RefreshToken!,
      idToken: result!.IdToken!,
      expiresIn: result!.ExpiresIn!,
    };
  }
}
