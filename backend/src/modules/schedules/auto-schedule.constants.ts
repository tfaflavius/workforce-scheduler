/**
 * Orele de inceput permise pentru programul fix automat si pentru cererile de alta ora.
 * Toate sunt ture de 8 ore care exista deja in legenda programului (Z1..Z6).
 */
export const AUTO_SCHEDULE_STARTS = ['06:00', '07:30', '08:00', '09:00', '13:00', '14:00'] as const;

export const DEFAULT_OFFICE_START = '07:30';

/** Ora de final pentru o tura de 8 ore care incepe la `start` (HH:MM). */
export function endOf8h(start: string): string {
  const [h, m] = start.split(':').map(Number);
  const total = (h * 60 + m + 8 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Nota pusa pe asignarile automate; contine intervalul ca sa apara corect in grila (Z3, Z5...). */
export function autoNote(start: string): string {
  return `Program auto ${start}-${endOf8h(start)}`;
}
