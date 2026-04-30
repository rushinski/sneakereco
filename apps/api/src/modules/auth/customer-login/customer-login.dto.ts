export interface CustomerLoginDto {
  tenantId: string;
  email: string;
  password: string;
  deviceId: string;
  ipAddress?: string;
  userAgent?: string;
}