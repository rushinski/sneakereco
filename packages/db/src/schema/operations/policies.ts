import { pgPolicy } from "drizzle-orm/pg-core";

import { rdkAppRole } from "../shared/roles";
import { currentTenantScope, tenantAdminScope, tenantUserScope } from "../shared/rls";
import { auditEvents } from "./audit-events";
import { chargebackEvidence } from "./chargeback-evidence";
import { featuredItems } from "./featured-items";
import { userAddresses } from "./user-addresses";

export const userAddressesCustomerManagePolicy = pgPolicy(
  "user_addresses_customer_manage",
  {
    for: "all",
    to: rdkAppRole,
    using: tenantUserScope(userAddresses.tenantId, userAddresses.userId),
    withCheck: tenantUserScope(userAddresses.tenantId, userAddresses.userId),
  },
).link(userAddresses);

export const userAddressesAdminReadPolicy = pgPolicy("user_addresses_admin_read", {
  for: "select",
  to: rdkAppRole,
  using: tenantAdminScope(userAddresses.tenantId),
}).link(userAddresses);

export const auditEventsAdminReadPolicy = pgPolicy("audit_events_admin_read", {
  for: "select",
  to: rdkAppRole,
  using: tenantAdminScope(auditEvents.tenantId),
}).link(auditEvents);

export const chargebackEvidenceAdminReadPolicy = pgPolicy(
  "chargeback_evidence_admin_read",
  {
    for: "select",
    to: rdkAppRole,
    using: tenantAdminScope(chargebackEvidence.tenantId),
  },
).link(chargebackEvidence);

export const featuredItemsPublicReadPolicy = pgPolicy("featured_items_public_read", {
  for: "select",
  to: rdkAppRole,
  using: currentTenantScope(featuredItems.tenantId),
}).link(featuredItems);

export const featuredItemsAdminManagePolicy = pgPolicy(
  "featured_items_admin_manage",
  {
    for: "all",
    to: rdkAppRole,
    using: tenantAdminScope(featuredItems.tenantId),
    withCheck: tenantAdminScope(featuredItems.tenantId),
  },
).link(featuredItems);
