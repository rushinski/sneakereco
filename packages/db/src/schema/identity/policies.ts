import { sql } from "drizzle-orm";
import { pgPolicy } from "drizzle-orm/pg-core";

import { rdkAppRole } from "../shared/roles";
import {
  currentTenantId,
  currentTenantScope,
  currentUserId,
  currentUserScope,
  isTenantAdmin,
  tenantAdminScope,
  tenantUserScope,
} from "../shared/rls";
import { tenantMembers } from "./tenant-members";
import { tenants } from "./tenants";
import { users } from "./users";

export const tenantsSelectPolicy = pgPolicy("tenants_select", {
  for: "select",
  to: rdkAppRole,
  using: currentTenantScope(tenants.id),
}).link(tenants);

export const usersSelectOwnPolicy = pgPolicy("users_select_own", {
  for: "select",
  to: rdkAppRole,
  using: currentUserScope(users.id),
}).link(users);

export const usersAdminSelectPolicy = pgPolicy("users_admin_select", {
  for: "select",
  to: rdkAppRole,
  using: sql`${isTenantAdmin} and exists (
    select 1
    from ${tenantMembers}
    where ${tenantMembers.tenantId} = ${currentTenantId}
      and ${tenantMembers.userId} = ${users.id}
  )`,
}).link(users);

export const usersUpdateOwnPolicy = pgPolicy("users_update_own", {
  for: "update",
  to: rdkAppRole,
  using: currentUserScope(users.id),
  withCheck: currentUserScope(users.id),
}).link(users);

export const tenantMembersTenantIsolationPolicy = pgPolicy(
  "tenant_members_tenant_isolation",
  {
    as: "restrictive",
    for: "select",
    to: rdkAppRole,
    using: currentTenantScope(tenantMembers.tenantId),
  },
).link(tenantMembers);

export const tenantMembersSelectOwnPolicy = pgPolicy("tenant_members_select_own", {
  for: "select",
  to: rdkAppRole,
  using: currentUserScope(tenantMembers.userId),
}).link(tenantMembers);

export const tenantMembersAdminSelectPolicy = pgPolicy(
  "tenant_members_admin_select",
  {
    for: "select",
    to: rdkAppRole,
    using: tenantAdminScope(tenantMembers.tenantId),
  },
).link(tenantMembers);

export const tenantMembersAdminManagePolicy = pgPolicy(
  "tenant_members_admin_manage",
  {
    for: "all",
    to: rdkAppRole,
    using: tenantAdminScope(tenantMembers.tenantId),
    withCheck: tenantAdminScope(tenantMembers.tenantId),
  },
).link(tenantMembers);

export const tenantMembersUpdateOwnPolicy = pgPolicy(
  "tenant_members_update_own",
  {
    for: "update",
    to: rdkAppRole,
    using: tenantUserScope(tenantMembers.tenantId, tenantMembers.userId),
    withCheck: tenantUserScope(tenantMembers.tenantId, tenantMembers.userId),
  },
).link(tenantMembers);
