import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { sneakerecoAppRole } from '../shared/roles';
import { currentTenantId, currentTenantScope, isTenantAdmin, tenantAdminScope } from '../shared/rls';

import { tenantAuthPageConfigs } from './tenant-auth-page-configs';
import { tenantAuthShellConfigs } from './tenant-auth-shell-configs';
import { tenantDomainConfig } from './tenant-domain-config';
import { tenantEmailConfig } from './tenant-email-config';
import { tenantEmailConfigVersions } from './tenant-email-config-versions';
import { tenantPageConfigs } from './tenant-page-configs';
import { tenantPageConfigVersions } from './tenant-page-config-versions';
import { tenantReleaseHistory } from './tenant-release-history';
import { tenantReleaseSets } from './tenant-release-sets';
import { tenantSeoConfig } from './tenant-seo-config';
import { tenantThemeConfig } from './tenant-theme-config';
import { tenantThemeVersions } from './tenant-theme-versions';

// ─── tenant_seo_config ────────────────────────────────────────────────────────

export const tenantSeoConfigPublicReadPolicy = pgPolicy('tenant_seo_config_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: currentTenantScope(tenantSeoConfig.tenantId),
}).link(tenantSeoConfig);

export const tenantSeoConfigAdminManagePolicy = pgPolicy('tenant_seo_config_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tenantSeoConfig.tenantId),
  withCheck: tenantAdminScope(tenantSeoConfig.tenantId),
}).link(tenantSeoConfig);

// ─── tenant_theme_config ──────────────────────────────────────────────────────

export const tenantThemeConfigPublicReadPolicy = pgPolicy('tenant_theme_config_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: currentTenantScope(tenantThemeConfig.tenantId),
}).link(tenantThemeConfig);

export const tenantThemeConfigAdminManagePolicy = pgPolicy('tenant_theme_config_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tenantThemeConfig.tenantId),
  withCheck: tenantAdminScope(tenantThemeConfig.tenantId),
}).link(tenantThemeConfig);

// ─── tenant_theme_versions ───────────────────────────────────────────────────

export const tenantThemeVersionsAdminManagePolicy = pgPolicy('tenant_theme_versions_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: sql`${isTenantAdmin} and exists (
    select 1 from ${tenantThemeConfig}
    where ${tenantThemeConfig.id} = ${tenantThemeVersions.tenantThemeConfigId}
      and ${tenantThemeConfig.tenantId} = ${currentTenantId}
  )`,
  withCheck: sql`${isTenantAdmin} and exists (
    select 1 from ${tenantThemeConfig}
    where ${tenantThemeConfig.id} = ${tenantThemeVersions.tenantThemeConfigId}
      and ${tenantThemeConfig.tenantId} = ${currentTenantId}
  )`,
}).link(tenantThemeVersions);

// ─── tenant_email_config ──────────────────────────────────────────────────────

export const tenantEmailConfigAdminManagePolicy = pgPolicy('tenant_email_config_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tenantEmailConfig.tenantId),
  withCheck: tenantAdminScope(tenantEmailConfig.tenantId),
}).link(tenantEmailConfig);

// ─── tenant_email_config_versions ─────────────────────────────────────────────

export const tenantEmailConfigVersionsAdminManagePolicy = pgPolicy(
  'tenant_email_config_versions_admin_manage',
  {
    for: 'all',
    to: sneakerecoAppRole,
    using: sql`${isTenantAdmin} and exists (
      select 1 from ${tenantEmailConfig}
      where ${tenantEmailConfig.id} = ${tenantEmailConfigVersions.tenantEmailConfigId}
        and ${tenantEmailConfig.tenantId} = ${currentTenantId}
    )`,
    withCheck: sql`${isTenantAdmin} and exists (
      select 1 from ${tenantEmailConfig}
      where ${tenantEmailConfig.id} = ${tenantEmailConfigVersions.tenantEmailConfigId}
        and ${tenantEmailConfig.tenantId} = ${currentTenantId}
    )`,
  },
).link(tenantEmailConfigVersions);

// ─── tenant_domain_config ─────────────────────────────────────────────────────

export const tenantDomainConfigAdminManagePolicy = pgPolicy('tenant_domain_config_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tenantDomainConfig.tenantId),
  withCheck: tenantAdminScope(tenantDomainConfig.tenantId),
}).link(tenantDomainConfig);

// ─── tenant_page_configs ──────────────────────────────────────────────────────

export const tenantPageConfigsPublicReadPolicy = pgPolicy('tenant_page_configs_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: currentTenantScope(tenantPageConfigs.tenantId),
}).link(tenantPageConfigs);

export const tenantPageConfigsAdminManagePolicy = pgPolicy('tenant_page_configs_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tenantPageConfigs.tenantId),
  withCheck: tenantAdminScope(tenantPageConfigs.tenantId),
}).link(tenantPageConfigs);

// ─── tenant_page_config_versions ──────────────────────────────────────────────

export const tenantPageConfigVersionsAdminManagePolicy = pgPolicy(
  'tenant_page_config_versions_admin_manage',
  {
    for: 'all',
    to: sneakerecoAppRole,
    using: sql`${isTenantAdmin} and exists (
      select 1 from ${tenantPageConfigs}
      where ${tenantPageConfigs.id} = ${tenantPageConfigVersions.tenantPageConfigId}
        and ${tenantPageConfigs.tenantId} = ${currentTenantId}
    )`,
    withCheck: sql`${isTenantAdmin} and exists (
      select 1 from ${tenantPageConfigs}
      where ${tenantPageConfigs.id} = ${tenantPageConfigVersions.tenantPageConfigId}
        and ${tenantPageConfigs.tenantId} = ${currentTenantId}
    )`,
  },
).link(tenantPageConfigVersions);

// ─── tenant_auth_shell_configs ────────────────────────────────────────────────

export const tenantAuthShellConfigsPublicReadPolicy = pgPolicy(
  'tenant_auth_shell_configs_public_read',
  {
    for: 'select',
    to: sneakerecoAppRole,
    using: currentTenantScope(tenantAuthShellConfigs.tenantId),
  },
).link(tenantAuthShellConfigs);

export const tenantAuthShellConfigsAdminManagePolicy = pgPolicy(
  'tenant_auth_shell_configs_admin_manage',
  {
    for: 'all',
    to: sneakerecoAppRole,
    using: tenantAdminScope(tenantAuthShellConfigs.tenantId),
    withCheck: tenantAdminScope(tenantAuthShellConfigs.tenantId),
  },
).link(tenantAuthShellConfigs);

// ─── tenant_auth_page_configs ─────────────────────────────────────────────────

export const tenantAuthPageConfigsPublicReadPolicy = pgPolicy(
  'tenant_auth_page_configs_public_read',
  {
    for: 'select',
    to: sneakerecoAppRole,
    using: sql`exists (
      select 1 from ${tenantAuthShellConfigs}
      where ${tenantAuthShellConfigs.id} = ${tenantAuthPageConfigs.tenantAuthShellConfigId}
        and ${tenantAuthShellConfigs.tenantId} = ${currentTenantId}
    )`,
  },
).link(tenantAuthPageConfigs);

export const tenantAuthPageConfigsAdminManagePolicy = pgPolicy(
  'tenant_auth_page_configs_admin_manage',
  {
    for: 'all',
    to: sneakerecoAppRole,
    using: sql`${isTenantAdmin} and exists (
      select 1 from ${tenantAuthShellConfigs}
      where ${tenantAuthShellConfigs.id} = ${tenantAuthPageConfigs.tenantAuthShellConfigId}
        and ${tenantAuthShellConfigs.tenantId} = ${currentTenantId}
    )`,
    withCheck: sql`${isTenantAdmin} and exists (
      select 1 from ${tenantAuthShellConfigs}
      where ${tenantAuthShellConfigs.id} = ${tenantAuthPageConfigs.tenantAuthShellConfigId}
        and ${tenantAuthShellConfigs.tenantId} = ${currentTenantId}
    )`,
  },
).link(tenantAuthPageConfigs);

// ─── tenant_release_sets ──────────────────────────────────────────────────────

export const tenantReleaseSetsPublicReadPolicy = pgPolicy('tenant_release_sets_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: sql`${currentTenantScope(tenantReleaseSets.tenantId)} and ${tenantReleaseSets.status} = 'published'`,
}).link(tenantReleaseSets);

export const tenantReleaseSetsAdminManagePolicy = pgPolicy('tenant_release_sets_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tenantReleaseSets.tenantId),
  withCheck: tenantAdminScope(tenantReleaseSets.tenantId),
}).link(tenantReleaseSets);

// ─── tenant_release_history ───────────────────────────────────────────────────

export const tenantReleaseHistoryAdminReadPolicy = pgPolicy('tenant_release_history_admin_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tenantReleaseHistory.tenantId),
}).link(tenantReleaseHistory);
