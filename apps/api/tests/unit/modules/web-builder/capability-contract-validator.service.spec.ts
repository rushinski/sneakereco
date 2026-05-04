import { BadRequestException } from '@nestjs/common';

import { CapabilityContractValidatorService } from '../../../../src/modules/web-builder/shared/capability-contract-validator.service';

describe('CapabilityContractValidatorService', () => {
  const service = new CapabilityContractValidatorService();

  it('accepts a login contract that covers the enabled auth features', () => {
    expect(() =>
      service.validate({
        pageType: 'login',
        capabilities: [
          'primary_sign_in',
          'registration_navigation',
          'forgot_password_path',
          'verify_email_continuation',
          'otp_entry',
          'mfa_challenge',
        ],
        enabledFeatures: {
          signupEnabled: true,
          forgotPasswordEnabled: true,
          emailVerificationRequired: true,
          otpLoginEnabled: true,
          mfaEnabled: true,
        },
      }),
    ).not.toThrow();
  });

  it('rejects a broken login contract that removes forgot-password navigation', () => {
    expect(() =>
      service.validate({
        pageType: 'login',
        capabilities: ['primary_sign_in'],
        enabledFeatures: {
          forgotPasswordEnabled: true,
        },
      }),
    ).toThrow(BadRequestException);
  });
});