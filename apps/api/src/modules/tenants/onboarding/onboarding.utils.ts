import { createHash, randomBytes } from 'node:crypto';

import { slugify } from '@sneakereco/shared';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

export function buildProvisionalSlug(seed: string): string {
  return `pending-${seed.replace(/^[^_]+_/, '').toLowerCase()}`;
}

export function normalizeInstagramHandle(handle: string): string {
  const trimmed = handle.trim();
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

export function buildInstagramUrl(handle: string): string {
  const normalized = normalizeInstagramHandle(handle);
  return `https://instagram.com/${normalized.replace(/^@/, '')}`;
}

export function buildAdminDomain(subdomain: string): string {
  return `${subdomain}.sneakereco.com`;
}

export function buildCandidateSlug(value: string): string {
  return slugify(value, 'store');
}

export function isInviteExpired(inviteSentAt: Date | null, now = new Date()): boolean {
  if (!inviteSentAt) {
    return true;
  }

  return inviteSentAt.getTime() + INVITE_TTL_MS < now.getTime();
}
