export interface CognitoJwtPayload {
  sub: string;
  email: string;
  token_use: string;
  client_id: string;
  'custom:tenant_id': string;
  'custom:role': 'admin' | 'customer';
  'custom:member_id': string;
}

export interface AuthenticatedUser {
  cognitoId: string;
  email: string;
  tenantId: string;
  role: 'admin' | 'customer';
  memberId: string;
}
