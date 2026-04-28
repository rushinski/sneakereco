import { pgPolicy } from 'drizzle-orm/pg-core';

import { sneakerecoAppRole } from '../shared/roles';
import { currentTenantScope, tenantAdminScope, tenantUserScope } from '../shared/rls';

import { auditEvents } from './audit-events';
import { chargebackEvidence } from './chargeback-evidence';
import { featuredItems } from './featured-items';
import { userAddresses } from './user-addresses';

export const userAddressesCustomerManagePolicy = pgPolicy('user_addresses_customer_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantUserScope(userAddresses.tenantId, userAddresses.userId),
  withCheck: tenantUserScope(userAddresses.tenantId, userAddresses.userId),
}).link(userAddresses);

export const userAddressesAdminReadPolicy = pgPolicy('user_addresses_admin_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: tenantAdminScope(userAddresses.tenantId),
}).link(userAddresses);

export const auditEventsAdminReadPolicy = pgPolicy('audit_events_admin_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: tenantAdminScope(auditEvents.tenantId),
}).link(auditEvents);

export const chargebackEvidenceAdminReadPolicy = pgPolicy('chargeback_evidence_admin_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: tenantAdminScope(chargebackEvidence.tenantId),
}).link(chargebackEvidence);

export const featuredItemsPublicReadPolicy = pgPolicy('featured_items_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: currentTenantScope(featuredItems.tenantId),
}).link(featuredItems);

export const featuredItemsAdminManagePolicy = pgPolicy('featured_items_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(featuredItems.tenantId),
  withCheck: tenantAdminScope(featuredItems.tenantId),
}).link(featuredItems);
