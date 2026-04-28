import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { sneakerecoAppRole } from '../shared/roles';
import {
  currentTenantId,
  currentTenantScope,
  isTenantAdmin,
  tenantAdminScope,
} from '../shared/rls';

import { productFilterEntries } from './product-filter-entries';
import { productFilters } from './product-filters';
import { productImages } from './product-images';
import { productVariants } from './product-variants';
import { products } from './products';
import { tagAliases } from './tag-aliases';
import { tagBrands } from './tag-brands';
import { tagModels } from './tag-models';

export const productsPublicReadPolicy = pgPolicy('products_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: sql`${currentTenantScope(products.tenantId)}
    and ${products.isActive} = true
    and ${products.goLiveAt} <= now()`,
}).link(products);

export const productsAdminAllPolicy = pgPolicy('products_admin_all', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(products.tenantId),
  withCheck: tenantAdminScope(products.tenantId),
}).link(products);

export const productVariantsPublicReadPolicy = pgPolicy('product_variants_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: sql`${currentTenantScope(productVariants.tenantId)} and exists (
      select 1
      from ${products}
      where ${products.id} = ${productVariants.productId}
        and ${products.isActive} = true
        and ${products.goLiveAt} <= now()
    )`,
}).link(productVariants);

export const productVariantsAdminAllPolicy = pgPolicy('product_variants_admin_all', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(productVariants.tenantId),
  withCheck: tenantAdminScope(productVariants.tenantId),
}).link(productVariants);

export const productImagesPublicReadPolicy = pgPolicy('product_images_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: sql`${currentTenantScope(productImages.tenantId)} and exists (
      select 1
      from ${products}
      where ${products.id} = ${productImages.productId}
        and ${products.isActive} = true
        and ${products.goLiveAt} <= now()
    )`,
}).link(productImages);

export const productImagesAdminAllPolicy = pgPolicy('product_images_admin_all', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(productImages.tenantId),
  withCheck: tenantAdminScope(productImages.tenantId),
}).link(productImages);

export const productFiltersPublicReadPolicy = pgPolicy('product_filters_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: currentTenantScope(productFilters.tenantId),
}).link(productFilters);

export const productFiltersAdminManagePolicy = pgPolicy('product_filters_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(productFilters.tenantId),
  withCheck: tenantAdminScope(productFilters.tenantId),
}).link(productFilters);

export const productFilterEntriesPublicReadPolicy = pgPolicy('product_filter_entries_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: sql`exists (
      select 1
      from ${products}
      inner join ${productFilters}
        on ${productFilters.id} = ${productFilterEntries.filterId}
      where ${products.id} = ${productFilterEntries.productId}
        and ${products.tenantId} = ${currentTenantId}
        and ${productFilters.tenantId} = ${currentTenantId}
        and ${products.isActive} = true
        and ${products.goLiveAt} <= now()
    )`,
}).link(productFilterEntries);

export const productFilterEntriesAdminManagePolicy = pgPolicy(
  'product_filter_entries_admin_manage',
  {
    for: 'all',
    to: sneakerecoAppRole,
    using: sql`${isTenantAdmin} and exists (
      select 1
      from ${products}
      inner join ${productFilters}
        on ${productFilters.id} = ${productFilterEntries.filterId}
      where ${products.id} = ${productFilterEntries.productId}
        and ${products.tenantId} = ${currentTenantId}
        and ${productFilters.tenantId} = ${currentTenantId}
    )`,
    withCheck: sql`${isTenantAdmin} and exists (
      select 1
      from ${products}
      inner join ${productFilters}
        on ${productFilters.id} = ${productFilterEntries.filterId}
      where ${products.id} = ${productFilterEntries.productId}
        and ${products.tenantId} = ${currentTenantId}
        and ${productFilters.tenantId} = ${currentTenantId}
    )`,
  },
).link(productFilterEntries);

export const tagBrandsPublicReadPolicy = pgPolicy('tag_brands_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: sql`${currentTenantScope(tagBrands.tenantId)} and ${tagBrands.isActive} = true`,
}).link(tagBrands);

export const tagBrandsAdminManagePolicy = pgPolicy('tag_brands_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tagBrands.tenantId),
  withCheck: tenantAdminScope(tagBrands.tenantId),
}).link(tagBrands);

export const tagModelsPublicReadPolicy = pgPolicy('tag_models_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: sql`${currentTenantScope(tagModels.tenantId)} and ${tagModels.isActive} = true`,
}).link(tagModels);

export const tagModelsAdminManagePolicy = pgPolicy('tag_models_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tagModels.tenantId),
  withCheck: tenantAdminScope(tagModels.tenantId),
}).link(tagModels);

export const tagAliasesPublicReadPolicy = pgPolicy('tag_aliases_public_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: sql`${currentTenantScope(tagAliases.tenantId)} and ${tagAliases.isActive} = true`,
}).link(tagAliases);

export const tagAliasesAdminManagePolicy = pgPolicy('tag_aliases_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(tagAliases.tenantId),
  withCheck: tenantAdminScope(tagAliases.tenantId),
}).link(tagAliases);
