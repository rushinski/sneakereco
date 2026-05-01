export interface ConsumeSetupInvitationDto {
  token: string;
}

export interface SetupSessionRecord {
  id: string;
  invitationId: string;
  tenantId: string;
  adminUserId: string;
  email: string;
  status: 'pending_password' | 'pending_mfa' | 'completed';
  expiresAt: string;
  challengeSessionToken?: string;
}