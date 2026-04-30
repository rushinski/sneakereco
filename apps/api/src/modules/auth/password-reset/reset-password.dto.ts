export interface ResetPasswordDto {
  tenantId: string;
  email: string;
  code: string;
  newPassword: string;
}