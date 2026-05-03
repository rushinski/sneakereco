export interface VerifyMfaSetupDto {
  accessToken: string;
  session: string;
  code: string;
}
