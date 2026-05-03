import { MfaSetupService } from '../../../../src/modules/auth/mfa-setup/mfa-setup.service';

const mockGateway = {
  initiateCustomerMfaSetup: jest.fn().mockResolvedValue({
    secretCode: 'JBSWY3DPEHPK3PXP',
    otpAuthUrl: 'otpauth://totp/SneakerEco:user%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=SneakerEco',
    session: 'cognito-session-token',
  }),
};

describe('MfaSetupService', () => {
  it('delegates to gateway and returns secret + QR data', async () => {
    const service = new MfaSetupService(mockGateway as never);
    const result = await service.initiateSetup('access-token');
    expect(mockGateway.initiateCustomerMfaSetup).toHaveBeenCalledWith('access-token');
    expect(result.secretCode).toBe('JBSWY3DPEHPK3PXP');
    expect(result.otpAuthUrl).toContain('SneakerEco');
    expect(result.session).toBe('cognito-session-token');
  });
});
