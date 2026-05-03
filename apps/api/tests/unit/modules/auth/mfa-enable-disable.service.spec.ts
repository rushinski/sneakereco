import { MfaEnableService } from '../../../../src/modules/auth/mfa-enable/mfa-enable.service';
import { MfaDisableService } from '../../../../src/modules/auth/mfa-disable/mfa-disable.service';

const mockGateway = {
  setCustomerMfaPreference: jest.fn().mockResolvedValue(undefined),
};

describe('MfaEnableService', () => {
  it('calls gateway with enabled=true', async () => {
    const service = new MfaEnableService(mockGateway as never);
    await service.enable('tok');
    expect(mockGateway.setCustomerMfaPreference).toHaveBeenCalledWith('tok', true);
  });
});

describe('MfaDisableService', () => {
  it('calls gateway with enabled=false', async () => {
    const service = new MfaDisableService(mockGateway as never);
    await service.disable('tok');
    expect(mockGateway.setCustomerMfaPreference).toHaveBeenCalledWith('tok', false);
  });
});
