export interface CognitoJwtPayload {
  sub: string;
  email: string;
  iss: string;
  token_use: string;
  client_id: string;
  'custom:tenant_id'?: string;
  'custom:role'?: 'admin' | 'customer';
  'custom:member_id'?: string;
}

export interface AuthenticatedUser {
  cognitoId: string;
  email: string;
  tenantId: string | undefined;
  role: 'admin' | 'customer' | undefined;
  memberId: string | undefined;
  isSuperAdmin: boolean;
}
