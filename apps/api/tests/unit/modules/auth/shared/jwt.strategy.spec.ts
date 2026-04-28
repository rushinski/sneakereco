import { describe, expect, it, jest } from '@jest/globals';

import { RequestCtx } from '../../../../../src/common/context/request-context';
import type { CognitoJwtPayload } from '../../../../../src/modules/auth/auth.types';
import { JwtStrategy } from '../../../../../src/modules/auth/shared/jwt/jwt.strategy';

describe('JwtStrategy', () => {
  it('validates a store-admin access token when Cognito omits the email claim', async () => {
    const repository = {
      findSubjectRevocation: jest.fn().mockResolvedValue(null),
      hasLineageRevocation: jest.fn().mockResolvedValue(false),
      findMembershipByCognitoSubAndTenant: jest.fn().mockResolvedValue({
        tenantId: 'tnt_heatkings',
        role: 'admin',
        memberId: 'mbr_123',
      }),
      findMembershipByCognitoSub: jest.fn(),
    };
    const cognito = {
      adminCheckMfaEnabled: jest.fn().mockResolvedValue(true),
    };
    const valkey = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    const config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'AWS_REGION') return 'us-east-1';
        if (key === 'COGNITO_POOL_ID') return 'pool_platform';
        if (key === 'COGNITO_PLATFORM_ADMIN_CLIENT_ID') return 'client_platform_admin';
        if (key === 'COGNITO_TENANT_ADMIN_CLIENT_ID') return 'client_store_admin';
        throw new Error(`Unexpected config key: ${key}`);
      }),
    };

    const strategy = new JwtStrategy(
      repository as never,
      cognito as never,
      valkey as never,
      config as never,
    );

    const payload: CognitoJwtPayload = {
      sub: 'sub_123',
      iss: 'https://cognito-idp.us-east-1.amazonaws.com/pool_platform',
      token_use: 'access',
      client_id: 'client_store_admin',
      username: 'cognito_username_123',
    };

    const result = await RequestCtx.run(
      {
        requestId: 'req_test',
        host: 'heatkings.sneakereco.test',
        hostType: 'store-public',
        surface: 'store-admin',
        canonicalHost: 'heatkings.sneakereco.test',
        isCanonicalHost: true,
        origin: 'store-admin',
        tenantId: 'tnt_heatkings',
        tenantSlug: 'heatkings',
        pool: { userPoolId: 'pool_platform', clientId: 'client_store_admin' },
        user: null,
      },
      () => strategy.validate(payload),
    );

    expect(cognito.adminCheckMfaEnabled).toHaveBeenCalledWith(
      'cognito_username_123',
      'pool_platform',
    );
    expect(result).toMatchObject({
      cognitoSub: 'sub_123',
      tenantId: 'tnt_heatkings',
      memberId: 'mbr_123',
      userType: 'store-admin',
      teamRole: 'admin',
    });
  });
});
