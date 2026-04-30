export interface RegisterDto {
  tenantId: string;
  email: string;
  password: string;
  fullName?: string;
}