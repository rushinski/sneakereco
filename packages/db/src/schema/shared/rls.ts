import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const currentTenantId = sql`current_setting('app.current_tenant_id', true)`;
export const currentUserId = sql`current_setting('app.current_user_id', true)`;
export const currentUserRole = sql`current_setting('app.current_user_role', true)`;
export const isTenantAdmin = sql`${currentUserRole} = 'admin'`;

export function currentTenantScope(column: AnyPgColumn) {
  return sql`${column} = ${currentTenantId}`;
}

export function currentUserScope(column: AnyPgColumn) {
  return sql`${column} = ${currentUserId}`;
}

export function tenantAdminScope(column: AnyPgColumn) {
  return sql`${currentTenantScope(column)} and ${isTenantAdmin}`;
}

export function tenantUserScope(
  tenantColumn: AnyPgColumn,
  userColumn: AnyPgColumn,
) {
  return sql`${currentTenantScope(tenantColumn)} and ${currentUserScope(
    userColumn,
  )}`;
}
