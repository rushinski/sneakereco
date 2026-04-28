/**
 * Convert dollar amount to cents.
 * Example: toCents(19.99) => 1999
 */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollar amount.
 * Example: toDollars(1999) => 19.99
 */
export function toDollars(cents: number): number {
  return cents / 100;
}

/**
 * Format cents as a USD currency string.
 * Example: formatMoney(1999) => "$19.99"
 */
export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(toDollars(cents));
}
