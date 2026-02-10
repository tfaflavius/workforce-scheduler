// Lista echipamentelor pentru Probleme Parcări
export const EQUIPMENT_LIST = [
  'Automate de Plata',
  'Bariere',
  'Terminale de Intrare',
  'Terminale de Iesire',
  'Router',
  'UPS',
  'Monitoare',
  'Uscatoare de Maini',
  'Automate de Sapun',
  'Lift',
  'Usa',
  'Curatenie',
  'Pompa',
  'Conducte',
  'Calorifere',
  'Toalete',
  'Dejectii',
  'Stalpi',
  'Camere Video',
  'Senzori de Parcare',
  'Camere LPR',
  'Masina de Spalat',
  'Aer Conditionat',
  'Senzor de Incendiu',
  'Buton de Incendiu',
  'Centrala de Incendiu',
  'Sprinklere',
  'Hidranti',
  'Tomberon',
  'Insula',
  'Parti Betonate',
  'Balustrade',
  'Pereti',
  'Infiltratii',
  'Geam',
  'Switch',
  'NVR',
  'DVR',
  'Graffiti',
  'Interfonie',
  'Video Wall',
  'Entervo',
  'Radiator',
  'Rigola',
  'Pisuar',
  'Ciuveta',
  'Robinet',
  'Calculator',
  'Clanta Usa',
  'Bara de limitare loc de parcare',
  'Afisaj Electronic',
  'Banner',
  'Panou electric',
  'Prelungitor',
  'Mentenanta Automate + Bariere',
  'Mentenanta Calculatoare',
  'Statie de Incarcare Electrica',
  'Mentenanta Retele',
  'Mentenanta Camere',
  'Forti',
  'Rack',
  'Semne Rutiere',
  'Corpuri de Iluminat',
  'Bec',
  'Bucla',
  'Internet',
  'Curent',
  'Retea interna',
  'Neon',
  'Led-uri',
] as const;

// Lista echipamentelor pentru Prejudicii Parcări (subset)
export const DAMAGE_EQUIPMENT_LIST = [
  'Automate de Plata',
  'Bariere',
  'Terminale de Intrare',
  'Terminale de Iesire',
  'Uscatoare de Maini',
  'Automate de Sapun',
  'Lift',
  'Usa',
  'Stalpi',
  'Camere Video',
  'Senzori de Parcare',
  'Camere LPR',
  'Buton de Incendiu',
  'Hidranti',
  'Tomberon',
  'Insula',
  'Parti Betonate',
  'Balustrade',
  'Pereti',
  'Geam',
  'Bara de limitare loc de parcare',
  'Afisaj Electronic',
  'Banner',
  'Statie de Incarcare Electrica',
  'Semne Rutiere',
  'Corpuri de Iluminat',
  'Led-uri',
  'Ciuveta',
  'Robinet',
] as const;

// Lista firmelor/compartimentelor contactate
export const COMPANY_LIST = [
  'Stingprod',
  'Electrica',
  'Întreținere Parcări',
  'Jolt Mediesi',
  'Dacian Indries',
  'Gicu',
  'Ghita Ghib',
  'Digi Rds&Rcs',
  'Firma Curatenie (Samara Clean)',
  'Karcher (Alcoprest)',
  'Pro Park',
  'Nexia',
  'Drum Asfalt',
  'Alsero',
  'Constructii Bihor',
  'Erbasu',
  'RER',
  'Compania de Apa',
  'Politia Locala',
  'Politia Nationala',
  'EvConnect',
  'Valcris',
  'Domirod',
  'IFMA',
  'Otis',
  'Elevator Serv',
  'IT Primarie',
] as const;

// Firmele care declanșează notificări și alocare către departamentul Întreținere Parcări
export const INTERNAL_MAINTENANCE_COMPANIES = [
  'Întreținere Parcări',
  'Jolt Mediesi',
  'Dacian Indries',
] as const;

// Tipuri de finalizare pentru prejudicii
export const DAMAGE_RESOLUTION_TYPES = {
  RECUPERAT: 'RECUPERAT',
  TRIMIS_JURIDIC: 'TRIMIS_JURIDIC',
} as const;

// Nume departament pentru verificare acces
export const DISPECERAT_DEPARTMENT_NAME = 'Dispecerat';
export const MAINTENANCE_DEPARTMENT_NAME = 'Întreținere Parcări';
export const HANDICAP_PARKING_DEPARTMENT_NAME = 'Parcări Handicap';
export const DOMICILIU_PARKING_DEPARTMENT_NAME = 'Parcări Domiciliu';

// Tipuri de solicitări handicap
export const HANDICAP_REQUEST_TYPES = {
  AMPLASARE_PANOU: 'AMPLASARE_PANOU',
  REVOCARE_PANOU: 'REVOCARE_PANOU',
  CREARE_MARCAJ: 'CREARE_MARCAJ',
} as const;

export type HandicapRequestType = typeof HANDICAP_REQUEST_TYPES[keyof typeof HANDICAP_REQUEST_TYPES];

// Status pentru solicitări handicap
export const HANDICAP_REQUEST_STATUS = {
  ACTIVE: 'ACTIVE',
  FINALIZAT: 'FINALIZAT',
} as const;

export type HandicapRequestStatus = typeof HANDICAP_REQUEST_STATUS[keyof typeof HANDICAP_REQUEST_STATUS];

// Labels în limba română pentru tipurile de solicitări handicap
export const HANDICAP_REQUEST_TYPE_LABELS: Record<HandicapRequestType, string> = {
  AMPLASARE_PANOU: 'Amplasare panou',
  REVOCARE_PANOU: 'Revocare panou',
  CREARE_MARCAJ: 'Creare marcaj',
};

// ============== PARCĂRI DOMICILIU ==============

// Tipuri de solicitări parcări domiciliu
export const DOMICILIU_REQUEST_TYPES = {
  APROBARE_LOC: 'APROBARE_LOC',           // Aprobare loc de parcare la domiciliu
  REVOCARE_LOC: 'REVOCARE_LOC',           // Revocare loc de parcare la domiciliu
  MODIFICARE_DATE: 'MODIFICARE_DATE',     // Modificare date (mașină, adresă, etc.)
} as const;

export type DomiciliuRequestType = typeof DOMICILIU_REQUEST_TYPES[keyof typeof DOMICILIU_REQUEST_TYPES];

// Status pentru solicitări domiciliu
export const DOMICILIU_REQUEST_STATUS = {
  ACTIVE: 'ACTIVE',
  FINALIZAT: 'FINALIZAT',
} as const;

export type DomiciliuRequestStatus = typeof DOMICILIU_REQUEST_STATUS[keyof typeof DOMICILIU_REQUEST_STATUS];

// Labels în limba română pentru tipurile de solicitări domiciliu
export const DOMICILIU_REQUEST_TYPE_LABELS: Record<DomiciliuRequestType, string> = {
  APROBARE_LOC: 'Aprobare loc',
  REVOCARE_LOC: 'Revocare loc',
  MODIFICARE_DATE: 'Modificare date',
};

// ============== LEGITIMAȚII HANDICAP ==============

// Status pentru legitimații handicap
export const HANDICAP_LEGITIMATION_STATUS = {
  ACTIVE: 'ACTIVE',
  FINALIZAT: 'FINALIZAT',
} as const;

export type HandicapLegitimationStatus = typeof HANDICAP_LEGITIMATION_STATUS[keyof typeof HANDICAP_LEGITIMATION_STATUS];
