import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { createdAtColumn, updatedAtColumn } from '../shared/columns';
import { tenants } from '../identity/tenants';

export const stateSalesTracking = pgTable(
  'state_sales_tracking',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    stateCode: varchar('state_code', { length: 2 }).notNull(),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    totalSalesCents: integer('total_sales_cents').notNull().default(0),
    taxableSalesCents: integer('taxable_sales_cents').notNull().default(0),
    taxCollectedCents: integer('tax_collected_cents').notNull().default(0),
    transactionCount: integer('transaction_count').notNull().default(0),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uniq_state_sales_tracking_tenant_period').on(
      table.tenantId,
      table.stateCode,
      table.year,
      table.month,
    ),
    index('idx_state_sales_tenant').on(table.tenantId),
    index('idx_state_sales_period').on(table.year, table.month),
    check('state_sales_tracking_month_check', sql`${table.month} between 1 and 12`),
  ],
);
