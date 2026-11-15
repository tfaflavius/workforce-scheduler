/**
 * Culorile de brand (un singur loc). Gradient albastru inchis -> albastru -> cyan,
 * fara violet (aplicatia ramane sobra/profesionala).
 */
export const BRAND = {
  deep: '#1e3a8a',
  main: '#2563eb',
  bright: '#0ea5e9',
  cyan: '#06b6d4',
};

/** Gradientul principal (antete, butoane, element activ din meniu). */
export const BRAND_GRADIENT = `linear-gradient(135deg, ${BRAND.deep} 0%, ${BRAND.main} 48%, ${BRAND.bright} 100%)`;
/** Varianta mai deschisa, pentru elemente mici (butoane, pastile). */
export const BRAND_GRADIENT_SOFT = `linear-gradient(135deg, ${BRAND.main} 0%, ${BRAND.bright} 100%)`;
/** Varianta pentru modul intunecat (mai putin stralucitoare). */
export const BRAND_GRADIENT_DARK = `linear-gradient(135deg, #172554 0%, #1d4ed8 55%, #0284c7 100%)`;
/** Umbra colorata (albastra) sub elementele cu gradient. */
export const BRAND_GLOW = '0 8px 24px rgba(37, 99, 235, 0.28)';

/** Perechi de culori pentru avatare (fara violet), alese stabil dupa nume. */
const AVATAR_PAIRS: Array<[string, string]> = [
  ['#2563eb', '#0ea5e9'],
  ['#0891b2', '#14b8a6'],
  ['#059669', '#22c55e'],
  ['#ea580c', '#f59e0b'],
  ['#dc2626', '#f97316'],
  ['#1e3a8a', '#3b82f6'],
  ['#0f766e', '#06b6d4'],
  ['#475569', '#94a3b8'],
];

const hashName = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
};

/** Gradient de avatar, mereu acelasi pentru acelasi nume. */
export const nameGradient = (name?: string | null) => {
  const [a, b] = AVATAR_PAIRS[hashName(name || '?') % AVATAR_PAIRS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
};

/** Culoare de text (pentru numele autorului in grupuri), aceeasi familie ca avatarul. */
export const nameColor = (name?: string | null) => AVATAR_PAIRS[hashName(name || '?') % AVATAR_PAIRS.length][0];

/** Initialele (maxim 2 litere). */
export const nameInitials = (name?: string | null) =>
  (name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'U';
