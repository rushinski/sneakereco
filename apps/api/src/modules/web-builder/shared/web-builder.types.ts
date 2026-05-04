export type AuthCapability =
  | 'primary_sign_in'
  | 'registration_navigation'
  | 'forgot_password_path'
  | 'verify_email_continuation'
  | 'reset_password_continuation'
  | 'otp_entry'
  | 'mfa_challenge'
  | 'status_messaging';

export interface ThemeDraft {
  id: string;
  tenantId: string;
  designFamilyId: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  tokens: Record<string, unknown>;
}

export interface AuthPageDraft {
  id: string;
  tenantId: string;
  pageType: 'login' | 'register' | 'forgot_password' | 'reset_password' | 'verify_email' | 'otp' | 'mfa';
  designFamilyId: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  requiredCapabilities: AuthCapability[];
  slotAssignments: Record<string, string>;
  content: Record<string, unknown>;
  editorVersion: number;
}

export interface EmailDraft {
  id: string;
  tenantId: string;
  emailType: 'verify_email' | 'password_reset' | 'login_otp' | 'setup_invitation';
  designFamilyId: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  sections: Array<{ slot: string; variantKey: string }>;
}

export interface ReleaseSetRecord {
  id: string;
  tenantId: string;
  name: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  themeVersionId: string;
  authPageVersionIds: string[];
  emailVersionIds: string[];
  scheduledFor?: string;
  publishedAt?: string;
  rolledBackFromReleaseSetId?: string;
}