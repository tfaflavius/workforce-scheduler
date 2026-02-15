/**
 * Sarbatori legale in Romania (2024-2027)
 * Include: 1-2 Ianuarie, 24 Ianuarie, Vinerea Mare, Paste Ortodox (Duminica+Luni),
 * 1 Mai, 1 Iunie, Rusalii (Duminica+Luni), 15 August, 30 Noiembrie, 1 Decembrie, 25-26 Decembrie
 */
export const ROMANIAN_PUBLIC_HOLIDAYS: string[] = [
  // 2024
  '2024-01-01', '2024-01-02', '2024-01-24',
  '2024-05-01',
  '2024-05-03', // Vinerea Mare
  '2024-05-05', '2024-05-06', // Paste Ortodox
  '2024-06-01',
  '2024-06-23', '2024-06-24', // Rusalii
  '2024-08-15', '2024-11-30', '2024-12-01', '2024-12-25', '2024-12-26',

  // 2025
  '2025-01-01', '2025-01-02', '2025-01-24',
  '2025-04-18', // Vinerea Mare
  '2025-04-20', '2025-04-21', // Paste Ortodox
  '2025-05-01', '2025-06-01',
  '2025-06-08', '2025-06-09', // Rusalii
  '2025-08-15', '2025-11-30', '2025-12-01', '2025-12-25', '2025-12-26',

  // 2026
  '2026-01-01', '2026-01-02', '2026-01-24',
  '2026-04-10', // Vinerea Mare
  '2026-04-12', '2026-04-13', // Paste Ortodox
  '2026-05-01',
  '2026-05-31', '2026-06-01', // Rusalii (31 mai + 1 iun = si Ziua Copilului)
  '2026-08-15', '2026-11-30', '2026-12-01', '2026-12-25', '2026-12-26',

  // 2027
  '2027-01-01', '2027-01-02', '2027-01-24',
  '2027-04-30', // Vinerea Mare
  '2027-05-01', // Paste Ortodox Duminica (+ 1 Mai)
  '2027-05-02', // Paste Ortodox Luni
  '2027-05-03', // Paste Ortodox Marti (zi libera acordata)
  '2027-06-01',
  '2027-06-20', '2027-06-21', // Rusalii
  '2027-08-15', '2027-11-30', '2027-12-01', '2027-12-25', '2027-12-26',
];

const holidaySet = new Set(ROMANIAN_PUBLIC_HOLIDAYS);

export function isRomanianPublicHoliday(dateStr: string): boolean {
  return holidaySet.has(dateStr);
}

export function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + 'T12:00:00').getDay();
  return day === 0 || day === 6;
}

export function isWorkingDay(dateStr: string): boolean {
  return !isWeekend(dateStr) && !isRomanianPublicHoliday(dateStr);
}
