import { createCorsOriginValidator } from '../../../../src/core/security/cors-origin-policy';
import { TrustedHostService } from '../../../../src/core/security/trusted-host.service';
const domainConfig = {
  baseDomain: 'sneakereco.test',
  apiBaseUrl: 'https://api.sneakereco.test',
  platformUrl: 'https://sneakereco.test',
  platformDashboardUrl: 'https://dashboard.sneakereco.test',
  staticAllowedOrigins: [],
};

const trustedHostService = new TrustedHostService(domainConfig);

describe('createCorsOriginValidator', () => {
  it('allows platform host without lookup', async () => {
    const findAllowedOriginHost = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(false);
    const validateOrigin = createCorsOriginValidator(trustedHostService, findAllowedOriginHost);

    await expect(validateOrigin('https://dashboard.sneakereco.test')).resolves.toBe(true);
    expect(findAllowedOriginHost).not.toHaveBeenCalled();
  });

  it('allows tenant storefront subdomains without lookup', async () => {
    const findAllowedOriginHost = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(false);
    const validateOrigin = createCorsOriginValidator(trustedHostService, findAllowedOriginHost);

    await expect(validateOrigin('https://kicks.sneakereco.test')).resolves.toBe(true);
    await expect(validateOrigin('https://ops.sneakereco.test')).resolves.toBe(true);
    expect(findAllowedOriginHost).not.toHaveBeenCalled();
  });

  it('rejects api subdomain', async () => {
    const findAllowedOriginHost = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    const validateOrigin = createCorsOriginValidator(trustedHostService, findAllowedOriginHost);

    await expect(validateOrigin('https://api.sneakereco.test')).resolves.toBe(false);
    expect(findAllowedOriginHost).not.toHaveBeenCalled();
  });

  it('delegates custom domains to lookup', async () => {
    const findAllowedOriginHost = jest
      .fn<Promise<boolean>, [string]>()
      .mockImplementation(async (host) => host === 'heatkings.com' || host === 'admin.heatkings.com');
    const validateOrigin = createCorsOriginValidator(trustedHostService, findAllowedOriginHost);

    await expect(validateOrigin('https://heatkings.com')).resolves.toBe(true);
    await expect(validateOrigin('https://admin.heatkings.com')).resolves.toBe(true);
    await expect(validateOrigin('https://pending.com')).resolves.toBe(false);
    expect(findAllowedOriginHost).toHaveBeenCalledWith('heatkings.com');
    expect(findAllowedOriginHost).toHaveBeenCalledWith('admin.heatkings.com');
    expect(findAllowedOriginHost).toHaveBeenCalledWith('pending.com');
  });

  it('rejects insecure http origins before classify', async () => {
    const findAllowedOriginHost = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    const validateOrigin = createCorsOriginValidator(trustedHostService, findAllowedOriginHost);

    await expect(validateOrigin('http://dashboard.sneakereco.test')).resolves.toBe(false);
    await expect(validateOrigin('http://heatkings.com')).resolves.toBe(false);
    expect(findAllowedOriginHost).not.toHaveBeenCalled();
  });

  it('rejects missing origin', async () => {
    const findAllowedOriginHost = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    const validateOrigin = createCorsOriginValidator(trustedHostService, findAllowedOriginHost);

    await expect(validateOrigin(undefined)).resolves.toBe(false);
    expect(findAllowedOriginHost).not.toHaveBeenCalled();
  });

  it('rejects malformed origins', async () => {
    const findAllowedOriginHost = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    const validateOrigin = createCorsOriginValidator(trustedHostService, findAllowedOriginHost);

    await expect(validateOrigin('not a url')).resolves.toBe(false);
    expect(findAllowedOriginHost).not.toHaveBeenCalled();
  });

  it('fails closed when custom domain lookup rejects', async () => {
    const findAllowedOriginHost = jest
      .fn<Promise<boolean>, [string]>()
      .mockRejectedValue(new Error('lookup unavailable'));
    const validateOrigin = createCorsOriginValidator(trustedHostService, findAllowedOriginHost);

    await expect(validateOrigin('https://heatkings.com')).resolves.toBe(false);
    expect(findAllowedOriginHost).toHaveBeenCalledWith('heatkings.com');
  });
});
