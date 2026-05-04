import { BadRequestException, Injectable } from '@nestjs/common';

import type { AuthCapability } from './web-builder.types';

@Injectable()
export class CapabilityContractValidatorService {
  validate(input: {
    pageType: 'login' | 'register' | 'forgot_password' | 'reset_password' | 'verify_email' | 'otp' | 'mfa';
    capabilities: AuthCapability[];
    enabledFeatures: {
      signupEnabled?: boolean;
      forgotPasswordEnabled?: boolean;
      emailVerificationRequired?: boolean;
      otpLoginEnabled?: boolean;
      mfaEnabled?: boolean;
    };
  }) {
    const capabilities = new Set(input.capabilities);
    const missing: string[] = [];

    if (!capabilities.has('primary_sign_in') && input.pageType === 'login') {
      missing.push('primary_sign_in');
    }
    if (input.enabledFeatures.signupEnabled && !capabilities.has('registration_navigation')) {
      missing.push('registration_navigation');
    }
    if (input.enabledFeatures.forgotPasswordEnabled && !capabilities.has('forgot_password_path')) {
      missing.push('forgot_password_path');
    }
    if (input.enabledFeatures.emailVerificationRequired && !capabilities.has('verify_email_continuation')) {
      missing.push('verify_email_continuation');
    }
    if (input.enabledFeatures.otpLoginEnabled && !capabilities.has('otp_entry')) {
      missing.push('otp_entry');
    }
    if (input.enabledFeatures.mfaEnabled && !capabilities.has('mfa_challenge')) {
      missing.push('mfa_challenge');
    }

    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'invalid_capability_contract',
        message: 'Auth page configuration is missing required capabilities',
        details: { missing },
      });
    }
  }
}