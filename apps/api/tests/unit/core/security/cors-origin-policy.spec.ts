import { createCorsOriginValidator } from '../../../../src/core/security/cors-origin-policy';
import { SecurityService } from '../../../../src/core/security/security.service';

describe('createCorsOriginValidator', () => {
  const securityService = new SecurityService({
    REQUEST_ID_HEADER: 'x-request-id',
    CORRELATION_ID_HEADER: 'x-correlation-id',
    CSRF_SECRET: 'a'.repeat(32),
  } as never, {
    baseDomain: 'sneakereco.test',
    apiBaseUrl: 'https://api.sneakereco.test',
    platformUrl: 'https://sneakereco.test',
    platformDashboardUrl: 'https://dashboard.sneakereco.test',
    staticAllowedOrigins: ['https://ops.sneakereco.test'],
  } as never);

  it('allows configured platform origins without tenant lookup', async () => {
    const findAllowedOriginHost = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(false);
    const validateOrigin = createCorsOriginValidator(securityService, findAllowedOriginHost);

    await expect(validateOrigin('https://dashboard.sneakereco.test')).resolves.toBe(true);
    await expect(validateOrigin('https://ops.sneakereco.test')).resolves.toBe(true);
    expect(findAllowedOriginHost).not.toHaveBeenCalled();
  });

  it('rejects insecure tenant origins before lookup', async () => {
    const findAllowedOriginHost = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    const validateOrigin = createCorsOriginValidator(securityService, findAllowedOriginHost);

    await expect(validateOrigin('http://managed.sneakereco.test')).resolves.toBe(false);
    await expect(validateOrigin('http://heatkings.com')).resolves.toBe(false);
    expect(findAllowedOriginHost).not.toHaveBeenCalled();
  });

  it('allows only provisioned tenant hosts and ready custom domains', async () => {
    const findAllowedOriginHost = jest
      .fn<Promise<boolean>, [string]>()
      .mockImplementation(
        async (host) =>
          host === 'demo.sneakereco.test' || host === 'heatkings.com' || host === 'admin.heatkings.com',
      );
    const validateOrigin = createCorsOriginValidator(securityService, findAllowedOriginHost);

    await expect(validateOrigin('https://managed.sneakereco.test')).resolves.toBe(false);
    await expect(validateOrigin('https://demo.sneakereco.test')).resolves.toBe(true);
    await expect(validateOrigin('https://heatkings.com')).resolves.toBe(true);
    await expect(validateOrigin('https://admin.heatkings.com')).resolves.toBe(true);
    await expect(validateOrigin('https://pending-heatkings.com')).resolves.toBe(false);
    expect(findAllowedOriginHost).toHaveBeenCalledWith('managed.sneakereco.test');
    expect(findAllowedOriginHost).toHaveBeenCalledWith('demo.sneakereco.test');
    expect(findAllowedOriginHost).toHaveBeenCalledWith('heatkings.com');
    expect(findAllowedOriginHost).toHaveBeenCalledWith('admin.heatkings.com');
    expect(findAllowedOriginHost).toHaveBeenCalledWith('pending-heatkings.com');
  });

  it('rejects malformed origins', async () => {
    const findAllowedOriginHost = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    const validateOrigin = createCorsOriginValidator(securityService, findAllowedOriginHost);

    await expect(validateOrigin('not a url')).resolves.toBe(false);
    expect(findAllowedOriginHost).not.toHaveBeenCalled();
  });

  it('fails closed when tenant lookup rejects', async () => {
    const findAllowedOriginHost = jest
      .fn<Promise<boolean>, [string]>()
      .mockRejectedValue(new Error('lookup unavailable'));
    const validateOrigin = createCorsOriginValidator(securityService, findAllowedOriginHost);

    await expect(validateOrigin('https://heatkings.com')).resolves.toBe(false);
    expect(findAllowedOriginHost).toHaveBeenCalledWith('heatkings.com');
  });
});
