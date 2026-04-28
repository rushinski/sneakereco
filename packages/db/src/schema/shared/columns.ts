import { sql } from 'drizzle-orm';
import { text, timestamp } from 'drizzle-orm/pg-core';

const timestamptzConfig = {
  mode: 'date' as const,
  withTimezone: true,
};

export function timestamptz(name: string) {
  return timestamp(name, timestamptzConfig);
}

export function createdAtColumn(name = 'created_at') {
  return timestamptz(name).notNull().defaultNow();
}

export function updatedAtColumn(name = 'updated_at') {
  return timestamptz(name).notNull().defaultNow();
}

export function countryColumn(name = 'country') {
  return text(name).notNull().default('US');
}

export const jsonbEmptyObject = sql`'{}'::jsonb`;
export const textEmptyArray = sql`'{}'::text[]`;
