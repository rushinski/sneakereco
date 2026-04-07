import {
  buildAdminDomain,
  buildCandidateSlug,
  buildInstagramUrl,
  buildProvisionalSlug,
  hashInviteToken,
  isInviteExpired,
  normalizeInstagramHandle,
} from './onboarding.utils';

describe('onboarding utils', () => {
  it('builds stable token hashes', () => {
    expect(hashInviteToken('invite-token')).toBe(hashInviteToken('invite-token'));
    expect(hashInviteToken('invite-token')).not.toBe(hashInviteToken('other'));
  });

  it('creates provisional slugs from tenant ids', () => {
    expect(buildProvisionalSlug('tnt_01ABCXYZ')).toBe('pending-01abcxyz');
  });

  it('normalizes instagram handles and urls', () => {
    expect(normalizeInstagramHandle('shopname')).toBe('@shopname');
    expect(normalizeInstagramHandle('@shopname')).toBe('@shopname');
    expect(buildInstagramUrl('shopname')).toBe('https://instagram.com/shopname');
  });

  it('builds admin domains and normalized candidate slugs', () => {
    expect(buildAdminDomain('my-store')).toBe('admin.my-store.sneakereco.com');
    expect(buildCandidateSlug('The Rarest Store!')).toBe('the-rarest-store');
  });

  it('detects expired invites', () => {
    const now = new Date('2026-04-07T12:00:00.000Z');

    expect(isInviteExpired(new Date('2026-04-01T11:59:59.000Z'), now)).toBe(false);
    expect(isInviteExpired(new Date('2026-03-31T11:59:59.000Z'), now)).toBe(true);
    expect(isInviteExpired(null, now)).toBe(true);
  });
});
