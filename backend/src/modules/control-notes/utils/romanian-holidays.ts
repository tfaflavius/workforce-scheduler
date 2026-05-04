/**
 * Romanian public holidays. Includes fixed-date holidays plus Orthodox
 * Easter / Pentecost (calculated). Returns the list of YYYY-MM-DD strings
 * for a given year.
 */

/** Calculate Orthodox Easter Sunday using the Meeus/Jones/Butcher algorithm
 * adapted for the Julian-to-Gregorian conversion. Returns a Date in UTC. */
function orthodoxEaster(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3 = March, 4 = April
  const day = ((d + e + 114) % 31) + 1;
  // Convert from Julian to Gregorian by adding 13 days (valid 1900..2099)
  const julian = new Date(Date.UTC(year, month - 1, day));
  julian.setUTCDate(julian.getUTCDate() + 13);
  return julian;
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

export function getRomanianHolidays(year: number): string[] {
  const holidays = new Set<string>();

  // Fixed-date holidays
  const fixed: Array<[number, number]> = [
    [1, 1],   // Anul Nou
    [1, 2],   // Anul Nou
    [1, 24],  // Unirea Principatelor
    [5, 1],   // Ziua Muncii
    [6, 1],   // Ziua Copilului
    [8, 15],  // Adormirea Maicii Domnului
    [11, 30], // Sf. Andrei
    [12, 1],  // Ziua Nationala
    [12, 25], // Craciun
    [12, 26], // Craciun
  ];
  for (const [m, d] of fixed) {
    holidays.add(dateOnly(new Date(Date.UTC(year, m - 1, d))));
  }

  // Easter-based holidays (Orthodox)
  const easter = orthodoxEaster(year);
  holidays.add(dateOnly(addDays(easter, -2))); // Vinerea Mare
  holidays.add(dateOnly(easter));               // Pastele
  holidays.add(dateOnly(addDays(easter, 1)));   // Lunea de Pasti

  // Pentecost = 49 days after Easter (Sunday), Monday after
  holidays.add(dateOnly(addDays(easter, 49)));  // Rusalii
  holidays.add(dateOnly(addDays(easter, 50)));  // Lunea de Rusalii

  return Array.from(holidays).sort();
}

/**
 * Number of days in a month (1-12).
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Working days = days in month minus weekends (Sat/Sun) and Romanian
 * public holidays falling on weekdays.
 */
export function workingDaysInMonth(year: number, month: number): {
  totalDays: number;
  weekendDays: number;
  holidayDays: number; // weekday holidays only
  workingDays: number;
  holidayDates: string[]; // YYYY-MM-DD list of holidays inside this month
} {
  const total = daysInMonth(year, month);
  const holidayList = new Set(getRomanianHolidays(year));
  let weekendDays = 0;
  let holidayDays = 0;
  const holidayDates: string[] = [];

  for (let d = 1; d <= total; d++) {
    const date = new Date(Date.UTC(year, month - 1, d));
    const dow = date.getUTCDay(); // 0 = Sun, 6 = Sat
    const iso = dateOnly(date);
    const isWeekend = dow === 0 || dow === 6;
    const isHoliday = holidayList.has(iso);

    if (isHoliday) holidayDates.push(iso);
    if (isWeekend) weekendDays++;
    if (isHoliday && !isWeekend) holidayDays++;
  }

  return {
    totalDays: total,
    weekendDays,
    holidayDays,
    workingDays: total - weekendDays - holidayDays,
    holidayDates,
  };
}
