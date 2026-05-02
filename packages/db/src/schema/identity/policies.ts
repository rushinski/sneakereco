import { pgPolicy } from 'drizzle-orm/pg-core';

import { sneakerecoAppRole } from '../shared/roles';
import { currentTenantScope, currentUserScope, tenantAdminScope } from '../shared/rls';

import { adminTenantRelationships } from './admin-tenant-relationships';
import { adminUsers } from './admin-users';
import { tenantBusinessProfiles } from './tenant-business-profiles';
import { customerUsers } from './customer-users';
import { tenants } from './tenants';

export const tenantsSelectPolicy = pgPolicy('tenants_select', {
  for: 'select',
  to: sneakerecoAppRole,
  using: currentTenantScope(tenants.id),
}).link(tenants);

export const customerUsersSelectOwnPolicy = pgPolicy('customer_users_select_own', {
  for: 'select',
  to: sneakerecoAppRole,
  using: currentUserScope(customerUsers.id),
}).link(customerUsers);

export const customerUsersAdminSelectPolicy = pgPolicy('customer_users_admin_select', {
  for: 'select',
  to: sneakerecoAppRole,
  using: tenantAdminScope(customerUsers.tenantId),
}).link(customerUsers);

export const customerUsersUpdateOwnPolicy = pgPolicy('customer_users_update_own', {
  for: 'update',
  to: sneakerecoAppRole,
  using: currentUserScope(customerUsers.id),
  withCheck: currentUserScope(customerUsers.id),
}).link(customerUsers);

export const adminUsersSelectOwnPolicy = pgPolicy('admin_users_select_own', {
  for: 'select',
  to: sneakerecoAppRole,
  using: currentUserScope(adminUsers.id),
}).link(adminUsers);

export const adminUsersUpdateOwnPolicy = pgPolicy('admin_users_update_own', {
  for: 'update',
  to: sneakerecoAppRole,
  using: currentUserScope(adminUsers.id),
  withCheck: currentUserScope(adminUsers.id),
}).link(adminUsers);

export const adminTenantRelationshipsTenantIsolationPolicy = pgPolicy(
  'admin_tenant_relationships_tenant_isolation',
  {
    as: 'restrictive',
    for: 'select',
    to: sneakerecoAppRole,
    using: currentTenantScope(adminTenantRelationships.tenantId),
  },
).link(adminTenantRelationships);

export const adminTenantRelationshipsSelectOwnPolicy = pgPolicy(
  'admin_tenant_relationships_select_own',
  {
    for: 'select',
    to: sneakerecoAppRole,
    using: currentUserScope(adminTenantRelationships.adminUserId),
  },
).link(adminTenantRelationships);

export const adminTenantRelationshipsAdminSelectPolicy = pgPolicy(
  'admin_tenant_relationships_admin_select',
  {
    for: 'select',
    to: sneakerecoAppRole,
    using: tenantAdminScope(adminTenantRelationships.tenantId),
  },
).link(adminTenantRelationships);

export const adminTenantRelationshipsAdminManagePolicy = pgPolicy(
  'admin_tenant_relationships_admin_manage',
  {
    for: 'all',
    to: sneakerecoAppRole,
    using: tenantAdminScope(adminTenantRelationships.tenantId),
    withCheck: tenantAdminScope(adminTenantRelationships.tenantId),
  },
).link(adminTenantRelationships);

// ─── tenant_business_profiles ─────────────────────────────────────────────────

export const tenantBusinessProfilesPublicReadPolicy = pgPolicy(
  'tenant_business_profiles_public_read',
  {
    for: 'select',
    to: sneakerecoAppRole,
    using: currentTenantScope(tenantBusinessProfiles.tenantId),
  },
).link(tenantBusinessProfiles);

export const tenantBusinessProfilesAdminManagePolicy = pgPolicy(
  'tenant_business_profiles_admin_manage',
  {
    for: 'all',
    to: sneakerecoAppRole,
    using: tenantAdminScope(tenantBusinessProfiles.tenantId),
    withCheck: tenantAdminScope(tenantBusinessProfiles.tenantId),
  },
).link(tenantBusinessProfiles);