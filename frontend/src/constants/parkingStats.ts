// Locatii pentru statistici parcari etajate (tichete, ocupare) — Doja cu sub-niveluri
// Mirrors backend: backend/src/modules/parking/constants/parking.constants.ts

export const PARKING_STAT_LOCATIONS = [
  { key: 'INDEPENDENTEI', name: 'Parcarea Independentei', group: null, spots: 454 },
  { key: 'BRASOVULUI', name: 'Parcarea Brasovului', group: null, spots: 395 },
  { key: 'PRIMARIE', name: 'Parcarea Primarie', group: null, spots: 42 },
  { key: 'BARITIU', name: 'Parcarea Baritiu', group: null, spots: 330 },
  { key: 'SPITAL_MUNICIPAL', name: 'Parcarea Spital Municipal', group: null, spots: 198 },
  { key: 'TRIBUNALULUI', name: 'Parcarea Tribunalului', group: null, spots: 450 },
  { key: 'IOSIF_VULCAN', name: 'Parcarea Iosif Vulcan', group: null, spots: 121 },
  { key: 'CETATE', name: 'Parcarea Cetate', group: null, spots: 225 },
  { key: 'DOJA_P0', name: 'P0', group: 'Parcarea Doja', spots: 87 },
  { key: 'DOJA_P1', name: 'P1', group: 'Parcarea Doja', spots: 93 },
  { key: 'DOJA_P2', name: 'P2', group: 'Parcarea Doja', spots: 107 },
  { key: 'DOJA_P3P4', name: 'P3+P4', group: 'Parcarea Doja', spots: 229 },
] as const;

export type ParkingStatLocationKey = typeof PARKING_STAT_LOCATIONS[number]['key'];

// Locatii pentru abonamente lunare — Doja ca o singura parcare (fara sub-niveluri)
export const PARKING_SUBSCRIPTION_LOCATIONS = [
  { key: 'INDEPENDENTEI', name: 'Parcarea Independentei', spots: 454 },
  { key: 'BRASOVULUI', name: 'Parcarea Brasovului', spots: 395 },
  { key: 'PRIMARIE', name: 'Parcarea Primarie', spots: 42 },
  { key: 'BARITIU', name: 'Parcarea Baritiu', spots: 330 },
  { key: 'SPITAL_MUNICIPAL', name: 'Parcarea Spital Municipal', spots: 198 },
  { key: 'TRIBUNALULUI', name: 'Parcarea Tribunalului', spots: 450 },
  { key: 'IOSIF_VULCAN', name: 'Parcarea Iosif Vulcan', spots: 121 },
  { key: 'CETATE', name: 'Parcarea Cetate', spots: 225 },
  { key: 'DOJA', name: 'Parcarea Doja', spots: 516 },
] as const;

export const TOTAL_SUBSCRIPTION_SPOTS = PARKING_SUBSCRIPTION_LOCATIONS.reduce((sum, l) => sum + l.spots, 0);

export type ParkingSubscriptionLocationKey = typeof PARKING_SUBSCRIPTION_LOCATIONS[number]['key'];

// Helper: returneaza numarul de locuri pentru o locatie
export const getLocationSpots = (key: string): number => {
  const loc = PARKING_STAT_LOCATIONS.find(l => l.key === key);
  return loc?.spots ?? 0;
};

// Helper: returneaza totalul de locuri pentru un grup (ex: Doja = 87+93+107+229)
export const getGroupTotalSpots = (groupName: string): number => {
  return PARKING_STAT_LOCATIONS
    .filter(l => l.group === groupName)
    .reduce((sum, l) => sum + l.spots, 0);
};

// Totalul de locuri pentru toate parcarile
export const TOTAL_PARKING_SPOTS = PARKING_STAT_LOCATIONS.reduce((sum, l) => sum + l.spots, 0);

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
