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
