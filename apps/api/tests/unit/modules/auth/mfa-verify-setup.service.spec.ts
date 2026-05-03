import { MfaVerifySetupService } from '../../../../src/modules/auth/mfa-verify-setup/mfa-verify-setup.service';

const mockGateway = {
  verifyCustomerMfaSetup: jest.fn().mockResolvedValue(undefined),
};

describe('MfaVerifySetupService', () => {
  it('delegates to gateway with access token, session, and code', async () => {
    const service = new MfaVerifySetupService(mockGateway as never);
    await service.verifySetup('access-token', 'session-token', '123456');
    expect(mockGateway.verifyCustomerMfaSetup).toHaveBeenCalledWith('access-token', 'session-token', '123456');
  });

  it('propagates errors from the gateway', async () => {
    mockGateway.verifyCustomerMfaSetup.mockRejectedValueOnce(new Error('Invalid code'));
    const service = new MfaVerifySetupService(mockGateway as never);
    await expect(service.verifySetup('tok', 'ses', 'bad')).rejects.toThrow('Invalid code');
  });
});
