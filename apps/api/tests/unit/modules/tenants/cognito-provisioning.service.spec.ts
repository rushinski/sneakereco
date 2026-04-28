import { describe, expect, it, jest } from '@jest/globals';
import { CognitoProvisioningService } from '../../../../src/modules/tenants/cognito-provisioning.service';

describe('CognitoProvisioningService.createTenantCustomerPool', () => {
  it('enables token revocation when creating a tenant customer app client', async () => {
    const mockClient = {
      send: jest
        .fn()
        .mockResolvedValueOnce({ UserPool: { Id: 'us-east-1_pool', Arn: 'arn:aws:cognito:us-east-1:123:userpool/us-east-1_pool' } })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ UserPoolClient: { ClientId: 'client123' } }),
    };

    const cognitoClientProvider = { client: mockClient };
    const config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'AWS_REGION') return 'us-east-1';
        if (key === 'COGNITO_POOL_ID') return 'us-east-1_adminpool';
        if (key === 'COGNITO_TENANT_ADMIN_CLIENT_ID') return 'storeadminclientid';
        throw new Error(`Unexpected config key: ${key}`);
      }),
      get: jest.fn().mockReturnValue(undefined),
    };

    const service = new CognitoProvisioningService(
      cognitoClientProvider as never,
      config as never,
    );

    await service.createTenantCustomerPool({ businessName: 'Heat Kings', subdomain: 'heatkings' });

    expect(mockClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          EnableTokenRevocation: true,
          AccessTokenValidity: 60,
          RefreshTokenValidity: 30,
        }),
      }),
    );
  });
});
