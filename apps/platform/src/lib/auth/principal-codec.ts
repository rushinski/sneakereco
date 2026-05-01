import { createHmac } from 'node:crypto';

import { sessionSigningSecret } from './config';
import type { AuthPrincipal } from './types';

export function principalHeaders(principal: AuthPrincipal) {
  const claims: Record<string, string | string[]> = {
    sub: principal.cognitoSub,
    iss: principal.userPoolId,
    client_id: principal.appClientId,
    'cognito:groups': principal.groups,
    'custom:session_id': principal.sessionId,
    'custom:session_version': principal.sessionVersion,
    iat: principal.issuedAt,
  };

  if (principal.adminType) {
    claims['custom:admin_type'] = principal.adminType;
  }

  if (principal.tenantId) {
    claims['custom:tenant_id'] = principal.tenantId;
  }

  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', sessionSigningSecret).update(payload).digest('base64url');

  return {
    'x-auth-principal': payload,
    'x-auth-principal-signature': signature,
  };
}