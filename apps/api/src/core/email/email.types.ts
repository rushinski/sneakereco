export type AuthEmailType = 'verify_email' | 'password_reset' | 'login_otp' | 'setup_invitation';

export type EmailTransportMode = 'smtp' | 'ses';

export interface AuthEmailPreviewFixture {
  stateKey:
    | 'verification_code'
    | 'password_reset_code'
    | 'login_otp_code'
    | 'setup_invitation'
    | 'fallback_branding';
  subjectLine: string;
  preheader: string;
  headline: string;
  body: string;
  code?: string;
  codeLabel?: string;
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: string;
  supportLabel?: string;
}

export interface EmailTemplateVariantRecord {
  id: string;
  key: string;
  designFamilyKey: string;
  emailFamilyKey: string;
  emailType: AuthEmailType;
  subjectTemplate: string;
  layout: 'editorial_light' | 'bold_dark';
}

export interface ResolvedSenderIdentity {
  id: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  readinessState: 'platform_fallback' | 'managed_subdomain_ready' | 'custom_domain_ready';
  purpose: 'auth';
  tenantId?: string;
}

export interface RenderedAuthEmail {
  subject: string;
  html: string;
  text: string;
  sender: ResolvedSenderIdentity;
  templateVariant: EmailTemplateVariantRecord;
  fixture: AuthEmailPreviewFixture;
}

export interface SendEmailInput {
  toEmail: string;
  subject: string;
  html: string;
  text: string;
  sender: ResolvedSenderIdentity;
  tags?: Record<string, string>;
}

export interface SentEmailRecord extends SendEmailInput {
  id: string;
  transport: EmailTransportMode;
  deliveredAt: string;
}