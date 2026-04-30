export interface BeginAdminSetupDto {
  setupSessionToken: string;
  password: string;
}

export interface CompleteAdminSetupDto {
  challengeSessionToken: string;
  code: string;
  deviceId: string;
  ipAddress?: string;
  userAgent?: string;
}