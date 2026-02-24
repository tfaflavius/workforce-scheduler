// Locatii pentru statistici parcari etajate
// Mirrors backend: backend/src/modules/parking/constants/parking.constants.ts

export const PARKING_STAT_LOCATIONS = [
  { key: 'BARITIU', name: 'Parcare Baritiu', group: null },
  { key: 'DOJA_P0', name: 'P0', group: 'Parcarea Doja' },
  { key: 'DOJA_P1', name: 'P1', group: 'Parcarea Doja' },
  { key: 'DOJA_P2', name: 'P2', group: 'Parcarea Doja' },
  { key: 'DOJA_P3P4', name: 'P3+P4', group: 'Parcarea Doja' },
  { key: 'BRASOVULUI', name: 'Parcarea Brașovului', group: null },
  { key: 'INDEPENDENTEI', name: 'Parcarea Independenței', group: null },
  { key: 'IOSIF_VULCAN', name: 'Parcarea Iosif Vulcan', group: null },
  { key: 'TRIBUNALULUI', name: 'Parcarea Tribunalului', group: null },
  { key: 'SPITAL_MUNICIPAL', name: 'Parcarea Spital Municipal', group: null },
  { key: 'CETATE', name: 'Parcarea Cetate', group: null },
  { key: 'PRIMARIE', name: 'Parcarea Primărie', group: null },
] as const;

export type ParkingStatLocationKey = typeof PARKING_STAT_LOCATIONS[number]['key'];

// Helper: returneaza numele complet (cu grup) pentru export PDF/Excel
export const getLocationFullName = (key: string): string => {
  const loc = PARKING_STAT_LOCATIONS.find(l => l.key === key);
  if (!loc) return key;
  return loc.group ? `${loc.group} - ${loc.name}` : loc.name;
};

// Helper: verifica daca o locatie e prima din grupul sau (pentru randare header grup)
export const isFirstInGroup = (index: number): boolean => {
  const loc = PARKING_STAT_LOCATIONS[index];
  if (!loc?.group) return false;
  if (index === 0) return true;
  return PARKING_STAT_LOCATIONS[index - 1]?.group !== loc.group;
};

// Helper: calculeaza totalul pe grupul Doja (sau alt grup)
export const getGroupKeys = (groupName: string): string[] => {
  return PARKING_STAT_LOCATIONS
    .filter(l => l.group === groupName)
    .map(l => l.key);
};
