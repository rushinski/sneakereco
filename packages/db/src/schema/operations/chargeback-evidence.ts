import {
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import {
  createdAtColumn,
  timestamptz,
  updatedAtColumn,
} from "../shared/columns";
import { tenants } from "../identity/tenants";
import { orders } from "../orders/orders";

export const chargebackEvidence = pgTable(
  "chargeback_evidence",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    nofraudTransactionId: text("nofraud_transaction_id"),
    nofraudDecision: text("nofraud_decision"),
    avsResultCode: text("avs_result_code"),
    cvvResultCode: text("cvv_result_code"),
    customerIp: inet("customer_ip"),
    paymentAmountCents: integer("payment_amount_cents"),
    paymentCurrency: text("payment_currency"),
    paymentMethodLast4: text("payment_method_last4"),
    paymentMethodType: text("payment_method_type"),
    billingAddressSnapshot: jsonb("billing_address_snapshot"),
    shippingAddressSnapshot: jsonb("shipping_address_snapshot"),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    deliveryConfirmedAt: timestamptz("delivery_confirmed_at"),
    deliveryEventSnapshot: jsonb("delivery_event_snapshot"),
    orderSnapshot: jsonb("order_snapshot"),
    taxCalculationSnapshot: jsonb("tax_calculation_snapshot"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("uniq_chargeback_evidence_order").on(table.orderId),
    index("idx_chargeback_evidence_tenant").on(table.tenantId),
  ],
);
