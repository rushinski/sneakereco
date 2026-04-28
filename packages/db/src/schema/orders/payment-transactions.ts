import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, smallint, text, varchar } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

import { orders } from './orders';

export const payrillaStatusValues = [
  'pending',
  'authorized',
  'captured',
  'voided',
  'declined',
  'error',
] as const;

export type PayrillaStatus = (typeof payrillaStatusValues)[number];

export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    payrillaReferenceNumber: integer('payrilla_reference_number'),
    payrillaAuthCode: text('payrilla_auth_code'),
    payrillaStatus: text('payrilla_status', { enum: payrillaStatusValues })
      .notNull()
      .default('pending'),
    cardType: text('card_type'),
    cardLast4: varchar('card_last4', { length: 4 }),
    cardExpiryMonth: smallint('card_expiry_month'),
    cardExpiryYear: smallint('card_expiry_year'),
    avsResultCode: varchar('avs_result_code', { length: 5 }),
    cvvResultCode: varchar('cvv_result_code', { length: 2 }),
    threeDsStatus: varchar('three_ds_status', { length: 2 }),
    threeDsEci: varchar('three_ds_eci', { length: 2 }),
    nofraudTransactionId: text('nofraud_transaction_id'),
    nofraudDecision: text('nofraud_decision'),
    amountRequestedCents: integer('amount_requested_cents').notNull(),
    amountAuthorizedCents: integer('amount_authorized_cents'),
    amountCapturedCents: integer('amount_captured_cents'),
    amountRefundedCents: integer('amount_refunded_cents').notNull().default(0),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    customerEmail: text('customer_email'),
    customerIp: text('customer_ip'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('idx_payment_transactions_order').on(table.orderId),
    index('idx_payment_transactions_tenant').on(table.tenantId),
    index('idx_payment_transactions_payrilla_ref')
      .on(table.payrillaReferenceNumber)
      .where(sql`${table.payrillaReferenceNumber} is not null`),
    check(
      'payment_transactions_payrilla_status_check',
      sql`${table.payrillaStatus} in ('pending', 'authorized', 'captured', 'voided', 'declined', 'error')`,
    ),
    check(
      'payment_transactions_nofraud_decision_check',
      sql`${table.nofraudDecision} is null or ${table.nofraudDecision} in ('pass', 'fail', 'review')`,
    ),
  ],
);
