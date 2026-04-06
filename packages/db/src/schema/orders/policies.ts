import { sql } from "drizzle-orm";
import { pgPolicy } from "drizzle-orm/pg-core";

import { rdkAppRole } from "../shared/roles";
import {
  currentTenantId,
  currentTenantScope,
  currentUserId,
  tenantAdminScope,
} from "../shared/rls";
import { orderAddresses } from "./order-addresses";
import { orderLineItems } from "./order-line-items";
import { orders } from "./orders";
import { paymentTransactions } from "./payment-transactions";

export const ordersAdminAllPolicy = pgPolicy("orders_admin_all", {
  for: "all",
  to: rdkAppRole,
  using: tenantAdminScope(orders.tenantId),
  withCheck: tenantAdminScope(orders.tenantId),
}).link(orders);

export const ordersCustomerSelectPolicy = pgPolicy("orders_customer_select", {
  for: "select",
  to: rdkAppRole,
  using: sql`${currentTenantScope(orders.tenantId)} and ${orders.userId} = ${currentUserId}`,
}).link(orders);

export const ordersCustomerInsertPolicy = pgPolicy("orders_customer_insert", {
  for: "insert",
  to: rdkAppRole,
  withCheck: sql`${currentTenantScope(orders.tenantId)} and (
    ${orders.userId} = ${currentUserId}
    or ${orders.userId} is null
  )`,
}).link(orders);

export const orderLineItemsAdminAllPolicy = pgPolicy(
  "order_line_items_admin_all",
  {
    for: "all",
    to: rdkAppRole,
    using: tenantAdminScope(orderLineItems.tenantId),
    withCheck: tenantAdminScope(orderLineItems.tenantId),
  },
).link(orderLineItems);

export const orderLineItemsCustomerReadPolicy = pgPolicy(
  "order_line_items_customer_read",
  {
    for: "select",
    to: rdkAppRole,
    using: sql`${currentTenantScope(orderLineItems.tenantId)} and exists (
      select 1
      from ${orders}
      where ${orders.id} = ${orderLineItems.orderId}
        and ${orders.tenantId} = ${currentTenantId}
        and ${orders.userId} = ${currentUserId}
    )`,
  },
).link(orderLineItems);

export const orderAddressesAdminAllPolicy = pgPolicy(
  "order_addresses_admin_all",
  {
    for: "all",
    to: rdkAppRole,
    using: tenantAdminScope(orderAddresses.tenantId),
    withCheck: tenantAdminScope(orderAddresses.tenantId),
  },
).link(orderAddresses);

export const orderAddressesCustomerReadPolicy = pgPolicy(
  "order_addresses_customer_read",
  {
    for: "select",
    to: rdkAppRole,
    using: sql`${currentTenantScope(orderAddresses.tenantId)} and exists (
      select 1
      from ${orders}
      where ${orders.id} = ${orderAddresses.orderId}
        and ${orders.tenantId} = ${currentTenantId}
        and ${orders.userId} = ${currentUserId}
    )`,
  },
).link(orderAddresses);

export const paymentTransactionsAdminReadPolicy = pgPolicy(
  "payment_transactions_admin_read",
  {
    for: "select",
    to: rdkAppRole,
    using: tenantAdminScope(paymentTransactions.tenantId),
  },
).link(paymentTransactions);
