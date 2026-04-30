export interface MfaChallengeDto {
  challengeSessionToken: string;
  code: string;
  deviceId: string;
  ipAddress?: string;
  userAgent?: string;
}