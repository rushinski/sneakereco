import { pgPolicy } from "drizzle-orm/pg-core";

import { sneakerecoAppRole } from "../shared/roles";
import { tenantAdminScope } from "../shared/rls";
import { nexusRegistrations } from "./nexus-registrations";
import { stateSalesTracking } from "./state-sales-tracking";
import { tenantTaxSettings } from "./tenant-tax-settings";

export const nexusRegistrationsAdminManagePolicy = pgPolicy(
  "nexus_registrations_admin_manage",
  {
    for: "all",
    to: sneakerecoAppRole,
    using: tenantAdminScope(nexusRegistrations.tenantId),
    withCheck: tenantAdminScope(nexusRegistrations.tenantId),
  },
).link(nexusRegistrations);

export const stateSalesTrackingAdminReadPolicy = pgPolicy(
  "state_sales_tracking_admin_read",
  {
    for: "select",
    to: sneakerecoAppRole,
    using: tenantAdminScope(stateSalesTracking.tenantId),
  },
).link(stateSalesTracking);

export const tenantTaxSettingsAdminManagePolicy = pgPolicy(
  "tenant_tax_settings_admin_manage",
  {
    for: "all",
    to: sneakerecoAppRole,
    using: tenantAdminScope(tenantTaxSettings.tenantId),
    withCheck: tenantAdminScope(tenantTaxSettings.tenantId),
  },
).link(tenantTaxSettings);
