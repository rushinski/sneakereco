import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { createdAtColumn, timestamptz, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';
import { adminUsers } from '../identity/admin-users';
import { customerUsers } from '../identity/customer-users';

export const orderStatusValues = [
  'pending',
  'processing',
  'paid',
  'shipped',
  'canceled',
  'failed',
  'blocked',
  'review',
  'refunded',
  'partially_refunded',
  'refund_pending',
  'refund_failed',
] as const;

export const orderFulfillmentTypeValues = ['ship', 'pickup'] as const;

export const orderFulfillmentStatusValues = [
  'unfulfilled',
  'label_created',
  'shipped',
  'delivered',
  'ready_for_pickup',
  'picked_up',
] as const;

export const nofraudDecisionValues = ['pass', 'fail', 'review'] as const;

export type OrderStatus = (typeof orderStatusValues)[number];
export type OrderFulfillmentType = (typeof orderFulfillmentTypeValues)[number];
export type OrderFulfillmentStatus = (typeof orderFulfillmentStatusValues)[number];
export type NofraudDecision = (typeof nofraudDecisionValues)[number];

export const orders = pgTable(
  'orders',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    customerUserId: text('customer_user_id').references(() => customerUsers.id, {
      onDelete: 'set null',
    }),
    guestEmail: text('guest_email'),
    subtotalCents: integer('subtotal_cents').notNull(),
    shippingCents: integer('shipping_cents').notNull(),
    taxCents: integer('tax_cents').notNull().default(0),
    feeCents: integer('fee_cents'),
    totalCents: integer('total_cents').notNull(),
    currency: text('currency').notNull().default('USD'),
    refundAmountCents: integer('refund_amount_cents'),
    status: text('status', { enum: orderStatusValues }).notNull().default('pending'),
    failureReason: text('failure_reason'),
    fulfillmentType: text('fulfillment_type', {
      enum: orderFulfillmentTypeValues,
    }),
    fulfillmentStatus: text('fulfillment_status', {
      enum: orderFulfillmentStatusValues,
    })
      .notNull()
      .default('unfulfilled'),
    shippingCarrier: text('shipping_carrier'),
    trackingNumber: text('tracking_number'),
    shippedAt: timestamptz('shipped_at'),
    actualShippingCostCents: integer('actual_shipping_cost_cents'),
    labelUrl: text('label_url'),
    labelCreatedAt: timestamptz('label_created_at'),
    labelCreatedByAdminUserId: text('label_created_by_admin_user_id').references(
      () => adminUsers.id,
      {
      onDelete: 'set null',
      },
    ),
    pickupLocationId: text('pickup_location_id'),
    pickupInstructions: text('pickup_instructions'),
    customerState: varchar('customer_state', { length: 2 }),
    taxCalculationId: text('tax_calculation_id'),
    taxTransactionId: text('tax_transaction_id'),
    nofraudTransactionId: text('nofraud_transaction_id'),
    nofraudDecision: text('nofraud_decision', { enum: nofraudDecisionValues }),
    payrillaTransactionId: text('payrilla_transaction_id'),
    idempotencyKey: text('idempotency_key'),
    cartHash: text('cart_hash'),
    refundedAt: timestamptz('refunded_at'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    expiresAt: timestamptz('expires_at'),
  },
  (table) => [
    uniqueIndex('uniq_orders_idempotency_key')
      .on(table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    index('idx_orders_tenant').on(table.tenantId),
    index('idx_orders_tenant_status').on(table.tenantId, table.status, table.createdAt.desc()),
    index('idx_orders_tenant_fulfillment').on(
      table.tenantId,
      table.fulfillmentStatus,
      table.createdAt.desc(),
    ),
    index('idx_orders_customer_user')
      .on(table.customerUserId, table.createdAt.desc())
      .where(sql`${table.customerUserId} is not null`),
    index('idx_orders_cart_hash')
      .on(table.cartHash)
      .where(sql`${table.cartHash} is not null`),
    index('idx_orders_created_at').on(table.tenantId, table.createdAt.desc()),
    check(
      'orders_status_check',
      sql`${table.status} in (
        'pending', 'processing', 'paid',
        'shipped', 'canceled', 'failed', 'blocked', 'review',
        'refunded', 'partially_refunded', 'refund_pending', 'refund_failed'
      )`,
    ),
    check(
      'orders_fulfillment_type_check',
      sql`${table.fulfillmentType} is null or ${table.fulfillmentType} in ('ship', 'pickup')`,
    ),
    check(
      'orders_fulfillment_status_check',
      sql`${table.fulfillmentStatus} in (
        'unfulfilled', 'label_created', 'shipped', 'delivered',
        'ready_for_pickup', 'picked_up'
      )`,
    ),
    check(
      'orders_nofraud_decision_check',
      sql`${table.nofraudDecision} is null or ${table.nofraudDecision} in ('pass', 'fail', 'review')`,
    ),
    check(
      'orders_customer_identity_check',
      sql`(
        ${table.status} in ('pending', 'canceled', 'failed', 'blocked', 'review')
        or ${table.customerUserId} is not null
        or ${table.guestEmail} is not null
      )`,
    ),
  ],
);
