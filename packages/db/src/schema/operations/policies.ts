import { pgPolicy } from 'drizzle-orm/pg-core';

import { sneakerecoAppRole } from '../shared/roles';
import { currentTenantScope, tenantAdminScope, tenantUserScope } from '../shared/rls';

import { auditEvents } from './audit-events';
import { chargebackEvidence } from './chargeback-evidence';
import { featuredItems } from './featured-items';
import { customerAddresses } from './user-addresses';

export const customerAddressesCustomerManagePolicy = pgPolicy('customer_addresses_customer_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantUserScope(customerAddresses.tenantId, customerAddresses.customerUserId),
  withCheck: tenantUserScope(customerAddresses.tenantId, customerAddresses.customerUserId),
}).link(customerAddresses);

export const customerAddressesAdminReadPolicy = pgPolicy('customer_addresses_admin_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: tenantAdminScope(customerAddresses.tenantId),
}).link(customerAddresses);

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
