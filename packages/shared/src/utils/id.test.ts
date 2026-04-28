import test from 'node:test';
import assert from 'node:assert/strict';

import { generateId, getEntityType } from './id.ts';

test('generateId uses new admin and customer identity prefixes', () => {
  const adminId = generateId('adminUser' as never);
  const customerId = generateId('customerUser' as never);
  const sessionId = generateId('authSession' as never);

  assert.match(adminId, /^adm_[0-9A-HJKMNP-TV-Z]{26}$/);
  assert.match(customerId, /^cus_[0-9A-HJKMNP-TV-Z]{26}$/);
  assert.match(sessionId, /^ses_[0-9A-HJKMNP-TV-Z]{26}$/);
});

test('getEntityType resolves rebuilt identity and config prefixes', () => {
  assert.equal(getEntityType('adm_01ARZ3NDEKTSV4RRFFQ69G5FAV'), 'adminUser');
  assert.equal(getEntityType('cus_01ARZ3NDEKTSV4RRFFQ69G5FAV'), 'customerUser');
  assert.equal(getEntityType('tap_01ARZ3NDEKTSV4RRFFQ69G5FAV'), 'tenantApplication');
  assert.equal(getEntityType('rls_01ARZ3NDEKTSV4RRFFQ69G5FAV'), 'tenantReleaseSet');
});
