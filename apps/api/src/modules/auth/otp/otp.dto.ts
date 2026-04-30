export interface OtpRequestDto {
  tenantId: string;
  email: string;
}

export interface OtpCompleteDto {
  tenantId: string;
  email: string;
  code: string;
  deviceId: string;
  ipAddress?: string;
  userAgent?: string;
}