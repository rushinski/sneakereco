import { describe, expect, it } from '@jest/globals';

import { buildAdminDomain } from '../../../../src/modules/tenants/onboarding/onboarding.utils';

describe('buildAdminDomain', () => {
  it('uses the current platform base domain for local environments', () => {
    expect(buildAdminDomain('heatkings', 'sneakereco.test')).toBe('heatkings.sneakereco.test');
  });
});
