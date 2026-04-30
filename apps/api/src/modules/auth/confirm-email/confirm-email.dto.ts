export interface ConfirmEmailDto {
  tenantId: string;
  email: string;
  code: string;
}