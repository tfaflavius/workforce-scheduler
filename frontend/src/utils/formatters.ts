/**
 * Shared currency formatters for RON.
 * Reuse these instead of creating new Intl.NumberFormat instances inline.
 */

/** RON formatter with 2 decimal places (standard) */
export const RON_FORMATTER = new Intl.NumberFormat('ro-RO', {
  style: 'currency',
  currency: 'RON',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** RON formatter with 0 decimal places (for dashboard summaries) */
export const RON_FORMATTER_NO_DECIMALS = new Intl.NumberFormat('ro-RO', {
  style: 'currency',
  currency: 'RON',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format a number as RON with 2 decimals. */
export function formatRON(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  return RON_FORMATTER.format(num);
}

/** Format a number as RON with 0 decimals (compact for dashboards). */
export function formatRONCompact(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  return RON_FORMATTER_NO_DECIMALS.format(num);
}
