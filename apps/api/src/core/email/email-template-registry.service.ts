import { Injectable, NotFoundException } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

import type { AuthEmailType, EmailTemplateVariantRecord } from './email.types';

@Injectable()
export class EmailTemplateRegistryService {
  private readonly variants: EmailTemplateVariantRecord[] = [
    {
      id: generateId('emailTemplateVariant'),
      key: 'email-family-a-verify-email',
      designFamilyKey: 'auth-family-a',
      emailFamilyKey: 'email-family-a',
      emailType: 'verify_email',
      subjectTemplate: 'Confirm your {{businessName}} account',
      layout: 'editorial_light',
    },
    {
      id: generateId('emailTemplateVariant'),
      key: 'email-family-a-password-reset',
      designFamilyKey: 'auth-family-a',
      emailFamilyKey: 'email-family-a',
      emailType: 'password_reset',
      subjectTemplate: 'Reset your {{businessName}} password',
      layout: 'editorial_light',
    },
    {
      id: generateId('emailTemplateVariant'),
      key: 'email-family-a-login-otp',
      designFamilyKey: 'auth-family-a',
      emailFamilyKey: 'email-family-a',
      emailType: 'login_otp',
      subjectTemplate: 'Your {{businessName}} sign-in code',
      layout: 'editorial_light',
    },
    {
      id: generateId('emailTemplateVariant'),
      key: 'email-family-a-setup-invitation',
      designFamilyKey: 'auth-family-a',
      emailFamilyKey: 'email-family-a',
      emailType: 'setup_invitation',
      subjectTemplate: 'Finish setting up your {{businessName}} admin account',
      layout: 'editorial_light',
    },
    {
      id: generateId('emailTemplateVariant'),
      key: 'email-family-b-verify-email',
      designFamilyKey: 'auth-family-b',
      emailFamilyKey: 'email-family-b',
      emailType: 'verify_email',
      subjectTemplate: 'Confirm your {{businessName}} account',
      layout: 'bold_dark',
    },
    {
      id: generateId('emailTemplateVariant'),
      key: 'email-family-b-password-reset',
      designFamilyKey: 'auth-family-b',
      emailFamilyKey: 'email-family-b',
      emailType: 'password_reset',
      subjectTemplate: 'Reset your {{businessName}} password',
      layout: 'bold_dark',
    },
    {
      id: generateId('emailTemplateVariant'),
      key: 'email-family-b-login-otp',
      designFamilyKey: 'auth-family-b',
      emailFamilyKey: 'email-family-b',
      emailType: 'login_otp',
      subjectTemplate: 'Your {{businessName}} sign-in code',
      layout: 'bold_dark',
    },
    {
      id: generateId('emailTemplateVariant'),
      key: 'email-family-b-setup-invitation',
      designFamilyKey: 'auth-family-b',
      emailFamilyKey: 'email-family-b',
      emailType: 'setup_invitation',
      subjectTemplate: 'Finish setting up your {{businessName}} admin account',
      layout: 'bold_dark',
    },
  ];

  listByDesignFamily(designFamilyKey: string) {
    return this.variants.filter((variant) => variant.designFamilyKey === designFamilyKey);
  }

  getVariant(designFamilyKey: string, emailType: AuthEmailType) {
    const variant = this.variants.find(
      (entry) => entry.designFamilyKey === designFamilyKey && entry.emailType === emailType,
    );

    if (!variant) {
      throw new NotFoundException(`Email template variant not found for ${designFamilyKey}:${emailType}`);
    }

    return variant;
  }
}