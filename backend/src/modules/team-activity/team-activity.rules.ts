/**
 * Ce actiuni ale angajatilor ajung ca notificare la managerii lor si cum se descriu.
 * Ruta = calea din controller fara prefixul /api (ex. "parking-issues/:id/resolve").
 */

/** Rute ignorate: zgomot tehnic sau actiuni care au deja notificarea lor. */
const IGNORED: RegExp[] = [
  /^auth\//,
  /^notifications(\/|$)/,
  /^chat(\/|$)/, // chatul are notificari proprii
  /^users(\/|$)/,
  /^reports\//,
  /^time-tracking\/location$/,
  /^time-tracking\/:id\/gps-status$/,
  /^time-tracking\/admin\//,
  /^holiday-preferences\/periods\/:id\/messages/, // chatul de sarbatori are notificari proprii
  /^daily-reports$/, // trimiterea raportului notifica deja managerii
];

/** Formulari speciale: `METODA ruta` -> text. */
const SPECIAL: Record<string, { text: string; url?: string | null }> = {
  'POST leave-requests': { text: 'a depus o cerere de concediu', url: '/admin/leave-requests' },
  'DELETE leave-requests/:id': {
    text: 'a anulat o cerere de concediu',
    url: '/admin/leave-requests',
  },
  'POST shift-swaps': { text: 'a cerut un schimb de tura', url: '/shift-swaps' },
  'POST shift-swaps/:id/respond': {
    text: 'a raspuns la o cerere de schimb de tura',
    url: '/shift-swaps',
  },
  'POST shift-swaps/:id/cancel': { text: 'a anulat un schimb de tura', url: '/shift-swaps' },
  'DELETE shift-swaps/:id': { text: 'a anulat un schimb de tura', url: '/shift-swaps' },
  'PATCH daily-reports/:id': { text: 'a modificat raportul zilnic', url: '/daily-reports' },
  'POST time-tracking/start': { text: 'a pornit pontajul', url: null },
  'POST time-tracking/:id/stop': { text: 'a oprit pontajul', url: null },
  'PUT holiday-preferences/periods/:id/me': {
    text: 'si-a completat preferintele pentru sarbatori',
    url: '/sarbatori',
  },
  'POST parking/domiciliu-requests/:id/request-sign-placement': {
    text: 'a cerut montarea unui indicator Domiciliu',
    url: '/parking/domiciliu',
  },
  'POST parking/domiciliu-requests/:id/claim-sign-placement': {
    text: 'a preluat montarea unui indicator Domiciliu',
    url: '/parking/domiciliu',
  },
  'POST parking/domiciliu-requests/:id/complete-sign-placement': {
    text: 'a finalizat montarea unui indicator Domiciliu',
    url: '/parking/domiciliu',
  },
  'PATCH parking-damages/:id/signature': {
    text: 'a adaugat semnatura la un prejudiciu',
    url: '/parking',
  },
  'POST edit-requests': { text: 'a cerut o modificare de date', url: null },
};

/** Modulul (prefixul rutei) -> ce anume s-a modificat si unde se vede. */
const MODULES: Array<{ prefix: string; noun: string; url: string | null }> = [
  { prefix: 'parking-issues', noun: 'o problema la parcari', url: '/parking' },
  { prefix: 'parking-damages', noun: 'un prejudiciu la parcari', url: '/parking' },
  { prefix: 'handicap-requests', noun: 'o solicitare Handicap', url: '/parking/handicap' },
  {
    prefix: 'parking/handicap-legitimations',
    noun: 'o legitimatie de handicap',
    url: '/parking/handicap',
  },
  {
    prefix: 'parking/revolutionar-legitimations',
    noun: 'o legitimatie de revolutionar',
    url: '/parking/handicap',
  },
  {
    prefix: 'parking/domiciliu-requests',
    noun: 'o solicitare Domiciliu',
    url: '/parking/domiciliu',
  },
  { prefix: 'control-sesizari', noun: 'o sesizare Control', url: '/control-sesizari' },
  {
    prefix: 'pv-display',
    noun: 'o sesiune de afisare procese verbale',
    url: '/procese-verbale',
  },
  {
    prefix: 'pv-signing',
    noun: 'o sesiune de semnare procese verbale',
    url: '/procese-verbale',
  },
  { prefix: 'cash-collections', noun: 'o incasare', url: null },
  {
    prefix: 'equipment-stock',
    noun: 'o pozitie din stocul de echipamente',
    url: '/stoc-echipamente',
  },
  { prefix: 'acquisitions', noun: 'datele de achizitii', url: '/achizitii' },
  { prefix: 'control-inspection-notes', noun: 'notele de constatare', url: '/note-constatare' },
  { prefix: 'parking-meters', noun: 'un parcometru', url: '/parcometre' },
  { prefix: 'parking-levels', noun: 'un nivel de parcare', url: '/parking/nivele' },
  { prefix: 'parking-stats', noun: 'statistici de parcare', url: null },
  { prefix: 'mobile-devices', noun: 'un dispozitiv mobil', url: '/dispozitive-mobile' },
  { prefix: 'tasks', noun: 'o sarcina', url: null },
  { prefix: 'investments', noun: 'datele de investitii', url: null },
  { prefix: 'leave-requests', noun: 'o cerere de concediu', url: '/admin/leave-requests' },
  { prefix: 'shift-swaps', noun: 'un schimb de tura', url: '/shift-swaps' },
  { prefix: 'holiday-preferences', noun: 'preferintele de sarbatori', url: '/sarbatori' },
  { prefix: 'schedules', noun: 'un program', url: '/schedules' },
];

export interface ActivityDescription {
  text: string;
  url: string | null;
}

/** Descrie actiunea sau intoarce null daca nu trebuie anuntata. */
export function describeActivity(method: string, routePath: string): ActivityDescription | null {
  const m = method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) return null;
  const route = routePath.replace(/^\/?(api\/)?/, '').replace(/\/$/, '');
  if (IGNORED.some((r) => r.test(route))) return null;

  const special = SPECIAL[`${m} ${route}`];
  if (special) return { text: special.text, url: special.url ?? null };

  const mod = MODULES.find((x) => route === x.prefix || route.startsWith(`${x.prefix}/`));
  if (!mod) return null;
  const rest = route.slice(mod.prefix.length);
  let verb = 'a actualizat';
  if (/\/comments$/.test(rest)) verb = 'a adaugat un comentariu la';
  else if (/\/resolve$/.test(rest)) verb = 'a rezolvat';
  else if (/\/unclaim$/.test(rest)) verb = 'a renuntat la';
  else if (/\/claim$/.test(rest)) verb = 'a preluat';
  else if (/\/complete$/.test(rest)) verb = 'a finalizat';
  else if (m === 'DELETE') verb = 'a sters';
  else if (m === 'POST') verb = 'a adaugat';
  else if (m === 'PATCH' || m === 'PUT') verb = 'a modificat';
  return { text: `${verb} ${mod.noun}`, url: mod.url };
}
