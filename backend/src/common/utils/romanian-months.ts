/**
 * Romanian month names array (1-indexed via helper function).
 * Used across notifications, emails, and reports.
 */
export const ROMANIAN_MONTHS = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
] as const;

/**
 * Get Romanian month name from a 1-based month number.
 */
export function getRomanianMonthName(month: number): string {
  return ROMANIAN_MONTHS[month - 1] || '';
}

/**
 * Format a "YYYY-MM" string to "Ianuarie 2024" format.
 */
export function formatMonthYear(monthYear: string): string {
  const [year, month] = monthYear.split('-');
  return `${getRomanianMonthName(parseInt(month))} ${year}`;
}
