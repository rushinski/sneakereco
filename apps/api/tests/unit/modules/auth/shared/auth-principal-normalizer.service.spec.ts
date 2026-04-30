import { UnauthorizedException } from '@nestjs/common';

import { AuthPrincipalNormalizerService } from '../../../../../src/modules/auth/shared/auth-principal-normalizer.service';

describe('AuthPrincipalNormalizerService', () => {
  const service = new AuthPrincipalNormalizerService();

  it('normalizes a tenant admin principal from trusted custom claims', () => {
    expect(
      service.normalize({
        sub: 'cognito-sub-1',
        iss: 'pool-1',
        client_id: 'client-1',
        'custom:admin_type': 'tenant_admin',
        'custom:tenant_id': 'tnt_123',
        'custom:session_id': 'ses_123',
        'custom:session_version': '1',
        'cognito:groups': ['tenant_admin'],
        iat: '2026-04-28T12:00:00.000Z',
      }),
    ).toEqual({
      actorType: 'tenant_admin',
      cognitoSub: 'cognito-sub-1',
      userPoolId: 'pool-1',
      appClientId: 'client-1',
      sessionId: 'ses_123',
      sessionVersion: '1',
      issuedAt: '2026-04-28T12:00:00.000Z',
      groups: ['tenant_admin'],
      adminType: 'tenant_admin',
      tenantId: 'tnt_123',
    });
  });

  it('rejects incomplete claim sets', () => {
    expect(() =>
      service.normalize({
        sub: 'cognito-sub-1',
      }),
    ).toThrow(UnauthorizedException);
  });
});