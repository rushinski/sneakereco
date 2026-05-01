import { Injectable, NotFoundException } from '@nestjs/common';

import type { AuthEmailPreviewFixture } from '../../../core/email/email.types';

@Injectable()
export class AuthEmailFixturesRepository {
  private readonly fixtures: Record<string, AuthEmailPreviewFixture> = {
    verification_code: {
      stateKey: 'verification_code',
      subjectLine: 'Confirm your account',
      preheader: 'Verify your email',
      headline: 'Confirm your account',
      body: 'Use this verification code to confirm your email and unlock the account.',
      codeLabel: 'Verification code',
      code: '179157',
      footerNote: 'This code expires in one hour.',
      supportLabel: 'Support',
    },
    password_reset_code: {
      stateKey: 'password_reset_code',
      subjectLine: 'Reset your password',
      preheader: 'Password reset',
      headline: 'Reset your password',
      body: 'Use this reset code to create a new password for your account.',
      codeLabel: 'Reset code',
      code: '284601',
      footerNote: 'If you did not request a password reset, you can ignore this email.',
    },
    login_otp_code: {
      stateKey: 'login_otp_code',
      subjectLine: 'Your sign-in code',
      preheader: 'Email code login',
      headline: 'Finish signing in',
      body: 'Use this one-time code to finish signing in without your password.',
      codeLabel: 'Sign-in code',
      code: '440128',
      footerNote: 'This code expires shortly for your safety.',
    },
    setup_invitation: {
      stateKey: 'setup_invitation',
      subjectLine: 'Finish setting up your admin account',
      preheader: 'Admin setup',
      headline: 'Complete your admin setup',
      body: 'Use the secure link below to create your password and connect your authenticator app.',
      ctaLabel: 'Complete setup',
      ctaHref: 'https://heatkings.sneakereco.com/admin/setup?token=setup_token',
      footerNote: 'This invitation expires in 24 hours.',
    },
    fallback_branding: {
      stateKey: 'fallback_branding',
      subjectLine: 'Confirm your account',
      preheader: 'Fallback sender',
      headline: 'Confirm your account',
      body: 'This preview shows the SneakerEco-managed subdomain sender until the tenant custom domain is ready.',
      codeLabel: 'Verification code',
      code: '115903',
      footerNote: 'The sender stays on the managed tenant subdomain until custom email identity is ready.',
    },
  };

  get(stateKey: string) {
    const fixture = this.fixtures[stateKey];
    if (!fixture) {
      throw new NotFoundException(`Auth email fixture ${stateKey} not found`);
    }
    return fixture;
  }

  list() {
    return Object.values(this.fixtures);
  }
}
