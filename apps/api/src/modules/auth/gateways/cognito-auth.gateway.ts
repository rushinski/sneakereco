import {
  AdminSetUserMFAPreferenceCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  AssociateSoftwareTokenCommand,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  SetUserMFAPreferenceCommand,
  SignUpCommand,
  VerifySoftwareTokenCommand,
  type AuthenticationResultType,
  type AttributeType,
  type InitiateAuthCommandInput,
} from '@aws-sdk/client-cognito-identity-provider';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac } from 'node:crypto';

import { CognitoAdminService } from '../../../core/cognito/cognito-admin.service';
import type { AuthConfig, Env } from '../../../core/config';
import { AUTH_CONFIG, ENVIRONMENT } from '../../../core/config/config.module';
import { CacheService } from '../../../core/cache/cache.service';
import { TenantCognitoConfigRepository } from '../../tenants/tenant-cognito/tenant-cognito-config.repository';
import type {
  AdminLoginChallenge,
  AdminSetupBeginResult,
  CompletedAuthChallenge,
  CustomerConfirmationResult,
  CustomerRegistrationResult,
  OtpRequestResult,
  PasswordResetRequestResult,
} from '../principals/auth.types';

type AdminChallengePayload = {
  session: string;
  email: string;
  clientId: string;
  actorType: 'platform_admin' | 'tenant_admin';
  tenantId?: string;
};

@Injectable()
export class CognitoAuthGateway {
  constructor(
    private readonly cognitoAdminService: CognitoAdminService,
    private readonly tenantCognitoConfigRepository: TenantCognitoConfigRepository,
    private readonly cacheService: CacheService,
    @Inject(AUTH_CONFIG) private readonly authConfig: AuthConfig,
    @Inject(ENVIRONMENT) private readonly env: Env,
  ) {}

  async adminLogin(input: {
    email: string;
    password: string;
    actorType: 'platform_admin' | 'tenant_admin';
    tenantId?: string;
  }): Promise<AdminLoginChallenge> {
    const clientId =
      input.actorType === 'platform_admin'
        ? this.authConfig.platformAdminClientId
        : this.authConfig.tenantAdminClientId;

    const response = await this.cognitoAdminService.getClient().send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
          USERNAME: input.email,
          PASSWORD: input.password,
        },
      }),
    );

    if (response.ChallengeName !== 'SOFTWARE_TOKEN_MFA' || !response.Session) {
      throw new UnauthorizedException('Expected TOTP challenge from Cognito');
    }

    return {
      status: 'mfa_required',
      challengeType: 'totp',
      challengeSessionToken: this.encodeChallenge({
        session: response.Session,
        email: input.email,
        clientId,
        actorType: input.actorType,
        tenantId: input.tenantId,
      }),
    };
  }

  async completeMfaChallenge(input: {
    challengeSessionToken: string;
    code: string;
    deviceId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<CompletedAuthChallenge> {
    const challenge = this.decodeChallenge(input.challengeSessionToken);
    const response = await this.cognitoAdminService.getClient().send(
      new RespondToAuthChallengeCommand({
        ChallengeName: 'SOFTWARE_TOKEN_MFA',
        ClientId: challenge.clientId,
        Session: challenge.session,
        ChallengeResponses: {
          USERNAME: challenge.email,
          SOFTWARE_TOKEN_MFA_CODE: input.code,
        },
      }),
    );

    return this.buildCompletedChallenge({
      authenticationResult: response.AuthenticationResult,
      actorType: challenge.actorType,
      tenantId: challenge.tenantId,
    });
  }

  async beginAdminSetup(input: {
    email: string;
    password: string;
    tenantId: string;
  }): Promise<AdminSetupBeginResult> {
    const adminPool = this.cognitoAdminService.getAdminPoolIdentity();
    const client = this.cognitoAdminService.getClient();

    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: adminPool.userPoolId,
        Username: input.email,
        Password: input.password,
        Permanent: true,
      }),
    );

    const authResponse = await client.send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: adminPool.tenantAdminClientId,
        AuthParameters: {
          USERNAME: input.email,
          PASSWORD: input.password,
        },
      }),
    );

    if (authResponse.ChallengeName !== 'MFA_SETUP' || !authResponse.Session) {
      throw new UnauthorizedException('Expected MFA_SETUP challenge from Cognito');
    }

    const associateResponse = await client.send(
      new AssociateSoftwareTokenCommand({
        Session: authResponse.Session,
      }),
    );

    if (!associateResponse.SecretCode || !associateResponse.Session) {
      throw new UnauthorizedException('Cognito did not return a TOTP setup secret');
    }

    return {
      challengeSessionToken: this.encodeChallenge({
        session: associateResponse.Session,
        email: input.email,
        clientId: adminPool.tenantAdminClientId,
        actorType: 'tenant_admin',
        tenantId: input.tenantId,
      }),
      totpSecret: associateResponse.SecretCode,
      otpauthUri: this.buildTotpUri(input.email, associateResponse.SecretCode),
    };
  }

  async completeAdminSetup(input: {
    challengeSessionToken: string;
    code: string;
    deviceId: string;
  }): Promise<CompletedAuthChallenge> {
    const challenge = this.decodeChallenge(input.challengeSessionToken);
    const client = this.cognitoAdminService.getClient();
    const adminPool = this.cognitoAdminService.getAdminPoolIdentity();

    const verifyResponse = await client.send(
      new VerifySoftwareTokenCommand({
        Session: challenge.session,
        UserCode: input.code,
        FriendlyDeviceName: input.deviceId,
      }),
    );

    if (verifyResponse.Status !== 'SUCCESS') {
      throw new UnauthorizedException('TOTP verification failed');
    }

    const response = await client.send(
      new RespondToAuthChallengeCommand({
        ChallengeName: 'MFA_SETUP',
        ClientId: challenge.clientId,
        Session: verifyResponse.Session ?? challenge.session,
        ChallengeResponses: {
          USERNAME: challenge.email,
        },
      }),
    );

    await client.send(
      new AdminSetUserMFAPreferenceCommand({
        UserPoolId: adminPool.userPoolId,
        Username: challenge.email,
        SoftwareTokenMfaSettings: {
          Enabled: true,
          PreferredMfa: true,
        },
      }),
    );

    return this.buildCompletedChallenge({
      authenticationResult: response.AuthenticationResult,
      actorType: 'tenant_admin',
      tenantId: challenge.tenantId,
    });
  }

  async registerCustomer(input: {
    tenantId: string;
    email: string;
    password: string;
    fullName?: string;
  }): Promise<CustomerRegistrationResult> {
    const tenantConfig = await this.requireTenantConfig(input.tenantId);
    await this.cognitoAdminService.getClient().send(
      new SignUpCommand({
        ClientId: tenantConfig.customerClientId,
        Username: input.email,
        Password: input.password,
        UserAttributes: this.userAttributes([
          ['email', input.email],
          ['name', input.fullName],
        ]),
      }),
    );

    return {
      status: 'confirmation_required',
    };
  }

  async confirmCustomerEmail(input: {
    tenantId: string;
    email: string;
    code: string;
  }): Promise<CustomerConfirmationResult> {
    const tenantConfig = await this.requireTenantConfig(input.tenantId);
    await this.cognitoAdminService.getClient().send(
      new ConfirmSignUpCommand({
        ClientId: tenantConfig.customerClientId,
        Username: input.email,
        ConfirmationCode: input.code,
      }),
    );

    const user = await this.cognitoAdminService.getClient().send(
      new AdminGetUserCommand({
        UserPoolId: tenantConfig.userPoolId,
        Username: input.email,
      }),
    );

    return {
      cognitoSub: this.attribute(user.UserAttributes, 'sub') ?? input.email,
      userPoolId: tenantConfig.userPoolId,
      email: this.attribute(user.UserAttributes, 'email') ?? input.email,
      fullName: this.attribute(user.UserAttributes, 'name') ?? undefined,
    };
  }

  async loginCustomer(input: {
    tenantId: string;
    email: string;
    password: string;
  }): Promise<CompletedAuthChallenge> {
    const tenantConfig = await this.requireTenantConfig(input.tenantId);
    const response = await this.cognitoAdminService.getClient().send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: tenantConfig.customerClientId,
        AuthParameters: {
          USERNAME: input.email,
          PASSWORD: input.password,
        },
      }),
    );

    return this.buildCompletedChallenge({
      authenticationResult: response.AuthenticationResult,
      actorType: 'customer',
      tenantId: input.tenantId,
    });
  }

  async refreshSession(input: {
    sessionId: string;
    refreshToken: string;
    userPoolId: string;
    appClientId: string;
    actorType: 'platform_admin' | 'tenant_admin' | 'customer';
  }): Promise<{ accessToken: string; refreshToken?: string }> {
    const response = await this.cognitoAdminService.getClient().send(
      new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: input.appClientId,
        AuthParameters: {
          REFRESH_TOKEN: input.refreshToken,
        },
      }),
    );

    const authResult = response.AuthenticationResult;
    if (!authResult?.AccessToken) {
      throw new UnauthorizedException('Cognito refresh did not return an access token');
    }

    return {
      accessToken: authResult.AccessToken,
      refreshToken: authResult.RefreshToken,
    };
  }

  async requestPasswordReset(input: {
    tenantId: string;
    email: string;
  }): Promise<PasswordResetRequestResult> {
    const tenantConfig = await this.requireTenantConfig(input.tenantId);
    await this.cognitoAdminService.getClient().send(
      new ForgotPasswordCommand({
        ClientId: tenantConfig.customerClientId,
        Username: input.email,
      }),
    );

    return {
      status: 'reset_requested',
    };
  }

  async resetPassword(input: {
    tenantId: string;
    email: string;
    code: string;
    newPassword: string;
  }): Promise<{ status: 'password_reset' }> {
    const tenantConfig = await this.requireTenantConfig(input.tenantId);
    await this.cognitoAdminService.getClient().send(
      new ConfirmForgotPasswordCommand({
        ClientId: tenantConfig.customerClientId,
        Username: input.email,
        ConfirmationCode: input.code,
        Password: input.newPassword,
      }),
    );

    return { status: 'password_reset' };
  }

  async requestEmailOtp(input: { tenantId: string; email: string }): Promise<OtpRequestResult> {
    const tenantConfig = await this.requireTenantConfig(input.tenantId);
    const response = await this.cognitoAdminService.getClient().send(
      new InitiateAuthCommand({
        AuthFlow: 'CUSTOM_AUTH',
        ClientId: tenantConfig.customerClientId,
        AuthParameters: {
          USERNAME: input.email,
        },
      }),
    );

    if (!response.Session) {
      throw new UnauthorizedException('Cognito OTP flow did not issue a challenge session');
    }

    await this.cacheService.client.set(
      this.otpSessionKey(input.tenantId, input.email),
      JSON.stringify({
        session: response.Session,
        appClientId: tenantConfig.customerClientId,
      }),
      'EX',
      this.authConfig.authChallengeSessionTtlSeconds,
    );

    return {
      status: 'otp_sent',
    };
  }

  async completeEmailOtp(input: {
    tenantId: string;
    email: string;
    code: string;
    deviceId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<CompletedAuthChallenge> {
    const tenantConfig = await this.requireTenantConfig(input.tenantId);
    const rawSession = await this.cacheService.client.get(this.otpSessionKey(input.tenantId, input.email));
    if (!rawSession) {
      throw new UnauthorizedException('OTP challenge session expired');
    }

    const otpSession = JSON.parse(rawSession) as { session: string; appClientId: string };
    const response = await this.cognitoAdminService.getClient().send(
      new RespondToAuthChallengeCommand({
        ChallengeName: 'CUSTOM_CHALLENGE',
        ClientId: otpSession.appClientId,
        Session: otpSession.session,
        ChallengeResponses: {
          USERNAME: input.email,
          ANSWER: input.code,
        },
      }),
    );

    await this.cacheService.client.del(this.otpSessionKey(input.tenantId, input.email));

    return this.buildCompletedChallenge({
      authenticationResult: response.AuthenticationResult,
      actorType: 'customer',
      tenantId: input.tenantId,
      userPoolIdOverride: tenantConfig.userPoolId,
      appClientIdOverride: tenantConfig.customerClientId,
    });
  }

  async initiateCustomerMfaSetup(accessToken: string): Promise<{ secretCode: string; otpAuthUrl: string; session: string }> {
    const result = await this.cognitoAdminService.getClient().send(
      new AssociateSoftwareTokenCommand({ AccessToken: accessToken }),
    );
    if (!result.SecretCode || !result.Session) {
      throw new UnauthorizedException('Cognito did not return MFA setup data');
    }
    const otpAuthUrl = this.buildCustomerTotpUri(accessToken, result.SecretCode);
    return { secretCode: result.SecretCode, otpAuthUrl, session: result.Session };
  }

  async verifyCustomerMfaSetup(accessToken: string, session: string, userCode: string): Promise<void> {
    const result = await this.cognitoAdminService.getClient().send(
      new VerifySoftwareTokenCommand({ AccessToken: accessToken, Session: session, UserCode: userCode }),
    );
    if (result.Status !== 'SUCCESS') {
      throw new UnauthorizedException('MFA verification code was incorrect');
    }
    await this.cognitoAdminService.getClient().send(
      new SetUserMFAPreferenceCommand({
        AccessToken: accessToken,
        SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true },
      }),
    );
  }

  async setCustomerMfaPreference(accessToken: string, enabled: boolean): Promise<void> {
    await this.cognitoAdminService.getClient().send(
      new SetUserMFAPreferenceCommand({
        AccessToken: accessToken,
        SoftwareTokenMfaSettings: { Enabled: enabled, PreferredMfa: enabled },
      }),
    );
  }

  private buildCustomerTotpUri(accessToken: string, secret: string) {
    const claims = this.decodeJwt(accessToken);
    const email = String(claims.username ?? claims.email ?? 'user');
    const issuer = 'SneakerEco';
    return `otpauth://totp/${encodeURIComponent(`${issuer}:${email}`)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}`;
  }

  private async requireTenantConfig(tenantId: string) {
    const tenantConfig = await this.tenantCognitoConfigRepository.findByTenantId(tenantId);
    if (!tenantConfig) {
      throw new UnauthorizedException(`No Cognito tenant configuration found for tenant ${tenantId}`);
    }

    return tenantConfig;
  }

  private buildCompletedChallenge(input: {
    authenticationResult: AuthenticationResultType | undefined;
    actorType: 'platform_admin' | 'tenant_admin' | 'customer';
    tenantId?: string;
    userPoolIdOverride?: string;
    appClientIdOverride?: string;
  }): CompletedAuthChallenge {
    const authResult = input.authenticationResult;
    if (!authResult?.AccessToken) {
      throw new UnauthorizedException('Cognito authentication did not return an access token');
    }

    const accessClaims = this.decodeJwt(authResult.AccessToken);
    const idClaims = authResult.IdToken ? this.decodeJwt(authResult.IdToken) : {};

    return {
      actorType: input.actorType,
      cognitoSub: String(idClaims.sub ?? accessClaims.sub ?? ''),
      userPoolId:
        input.userPoolIdOverride ??
        this.extractUserPoolId(String(accessClaims.iss ?? idClaims.iss ?? '')),
      appClientId: input.appClientIdOverride ?? String(accessClaims.client_id ?? ''),
      groups: this.asArray(accessClaims['cognito:groups'] ?? idClaims['cognito:groups']),
      email: String(idClaims.email ?? ''),
      tenantId: input.tenantId,
      accessToken: authResult.AccessToken,
      refreshToken: authResult.RefreshToken,
      originJti: String(accessClaims.origin_jti ?? idClaims.origin_jti ?? this.fallbackOriginJti(authResult.AccessToken)),
    };
  }

  private userAttributes(attributes: Array<[string, string | undefined]>) {
    return attributes
      .filter(([, value]) => typeof value === 'string' && value.length > 0)
      .map(([Name, Value]) => ({ Name, Value })) satisfies AttributeType[];
  }

  private attribute(attributes: AttributeType[] | undefined, name: string) {
    return attributes?.find((attribute) => attribute.Name === name)?.Value;
  }

  private decodeJwt(token: string) {
    const [, payload = ''] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
  }

  private asArray(value: unknown) {
    if (Array.isArray(value)) {
      return value.map(String);
    }

    if (typeof value === 'string' && value.length > 0) {
      return [value];
    }

    return [];
  }

  private extractUserPoolId(issuer: string) {
    return issuer.split('/').at(-1) ?? issuer;
  }

  private fallbackOriginJti(accessToken: string) {
    return createHash('sha256').update(accessToken).digest('hex');
  }

  private buildTotpUri(email: string, secret: string) {
    const issuer = 'SneakerEco Admin';
    return `otpauth://totp/${encodeURIComponent(`${issuer}:${email}`)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}`;
  }

  private encodeChallenge(challenge: AdminChallengePayload) {
    const payload = Buffer.from(JSON.stringify(challenge)).toString('base64url');
    const signature = createHmac('sha256', this.env.SESSION_SIGNING_SECRET)
      .update(payload)
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  private decodeChallenge(raw: string): AdminChallengePayload {
    const [payload, signature] = raw.split('.');
    if (!payload || !signature) {
      throw new UnauthorizedException('Invalid admin challenge token');
    }

    const expected = createHmac('sha256', this.env.SESSION_SIGNING_SECRET)
      .update(payload)
      .digest('base64url');
    if (expected !== signature) {
      throw new UnauthorizedException('Invalid admin challenge signature');
    }

    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminChallengePayload;
  }

  private otpSessionKey(tenantId: string, email: string) {
    const fingerprint = createHash('sha256').update(`${tenantId}:${email.toLowerCase()}`).digest('hex');
    return `auth:otp-session:${fingerprint}`;
  }
}
