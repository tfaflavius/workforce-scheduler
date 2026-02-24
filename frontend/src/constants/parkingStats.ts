// Locatii pentru statistici parcari etajate
// Mirrors backend: backend/src/modules/parking/constants/parking.constants.ts

export const PARKING_STAT_LOCATIONS = [
  { key: 'BARITIU', name: 'Parcare Baritiu' },
  { key: 'DOJA_P0', name: 'Parcarea Doja P0' },
  { key: 'DOJA_P1', name: 'Parcarea Doja P1' },
  { key: 'DOJA_P2', name: 'Parcarea Doja P2' },
  { key: 'DOJA_P3P4', name: 'Parcarea Doja P3+P4' },
  { key: 'BRASOVULUI', name: 'Parcarea Brașovului' },
  { key: 'INDEPENDENTEI', name: 'Parcarea Independenței' },
  { key: 'IOSIF_VULCAN', name: 'Parcarea Iosif Vulcan' },
  { key: 'TRIBUNALULUI', name: 'Parcarea Tribunalului' },
  { key: 'SPITAL_MUNICIPAL', name: 'Parcarea Spital Municipal' },
  { key: 'CETATE', name: 'Parcarea Cetate' },
  { key: 'PRIMARIE', name: 'Parcarea Primărie' },
] as const;

export type ParkingStatLocationKey = typeof PARKING_STAT_LOCATIONS[number]['key'];

export const getLocationName = (key: string): string => {
  return PARKING_STAT_LOCATIONS.find(l => l.key === key)?.name || key;
};
