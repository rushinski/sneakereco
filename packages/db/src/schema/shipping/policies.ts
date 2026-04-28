import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { sneakerecoAppRole } from '../shared/roles';
import {
  currentTenantId,
  currentTenantScope,
  currentUserId,
  tenantAdminScope,
} from '../shared/rls';
import { orders } from '../orders/orders';

import { shippingTrackingEvents } from './shipping-tracking-events';
import { tenantShippingConfig } from './tenant-shipping-config';

export const shippingTrackingAdminReadPolicy = pgPolicy('shipping_tracking_admin_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: tenantAdminScope(shippingTrackingEvents.tenantId),
}).link(shippingTrackingEvents);

export const shippingTrackingCustomerReadPolicy = pgPolicy('shipping_tracking_customer_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: sql`${currentTenantScope(shippingTrackingEvents.tenantId)} and exists (
      select 1
      from ${orders}
      where ${orders.id} = ${shippingTrackingEvents.orderId}
        and ${orders.tenantId} = ${currentTenantId}
        and ${orders.userId} = ${currentUserId}
    )`,
}).link(shippingTrackingEvents);

export const tenantShippingConfigAdminManagePolicy = pgPolicy(
  'tenant_shipping_config_admin_manage',
  {
    for: 'all',
    to: sneakerecoAppRole,
    using: tenantAdminScope(tenantShippingConfig.tenantId),
    withCheck: tenantAdminScope(tenantShippingConfig.tenantId),
  },
).link(tenantShippingConfig);
