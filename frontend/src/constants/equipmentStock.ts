export const STOCK_CATEGORIES = {
  PARCARI_ETAJATE: 'PARCARI_ETAJATE',
  PARCARI_STRADALE: 'PARCARI_STRADALE',
  PARCOMETRE: 'PARCOMETRE',
} as const;

export type StockCategory = keyof typeof STOCK_CATEGORIES;

export const STOCK_CATEGORY_LABELS: Record<StockCategory, string> = {
  PARCARI_ETAJATE: 'Parcari Etajate',
  PARCARI_STRADALE: 'Parcari Stradale',
  PARCOMETRE: 'Parcometre',
};
