import { Injectable, NotImplementedException } from '@nestjs/common';

import type {
  AdminLoginChallenge,
  CompletedAuthChallenge,
  CustomerConfirmationResult,
  CustomerRegistrationResult,
  OtpRequestResult,
  PasswordResetRequestResult,
} from './auth.types';

@Injectable()
export class CognitoAuthGateway {
  async adminLogin(_: { email: string; password: string }): Promise<AdminLoginChallenge> {
    throw new NotImplementedException('Cognito admin login is not wired yet');
  }

  async completeMfaChallenge(_: {
    challengeSessionToken: string;
    code: string;
    deviceId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<CompletedAuthChallenge> {
    throw new NotImplementedException('Cognito MFA challenge is not wired yet');
  }

  async registerCustomer(_: {
    tenantId: string;
    email: string;
    password: string;
    fullName?: string;
  }): Promise<CustomerRegistrationResult> {
    throw new NotImplementedException('Cognito customer registration is not wired yet');
  }

  async confirmCustomerEmail(_: {
    tenantId: string;
    email: string;
    code: string;
  }): Promise<CustomerConfirmationResult> {
    throw new NotImplementedException('Cognito email confirmation is not wired yet');
  }

  async loginCustomer(_: {
    tenantId: string;
    email: string;
    password: string;
  }): Promise<CompletedAuthChallenge> {
    throw new NotImplementedException('Cognito customer login is not wired yet');
  }

  async refreshSession(_: {
    sessionId: string;
    refreshToken: string;
  }): Promise<{ accessToken: string; refreshToken?: string }> {
    throw new NotImplementedException('Cognito session refresh is not wired yet');
  }

  async requestPasswordReset(_: {
    tenantId: string;
    email: string;
  }): Promise<PasswordResetRequestResult> {
    throw new NotImplementedException('Cognito password reset request is not wired yet');
  }

  async resetPassword(_: {
    tenantId: string;
    email: string;
    code: string;
    newPassword: string;
  }): Promise<{ status: 'password_reset' }> {
    throw new NotImplementedException('Cognito password reset completion is not wired yet');
  }

  async requestEmailOtp(_: { tenantId: string; email: string }): Promise<OtpRequestResult> {
    throw new NotImplementedException('Cognito email OTP request is not wired yet');
  }

  async completeEmailOtp(_: {
    tenantId: string;
    email: string;
    code: string;
    deviceId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<CompletedAuthChallenge> {
    throw new NotImplementedException('Cognito email OTP completion is not wired yet');
  }
}