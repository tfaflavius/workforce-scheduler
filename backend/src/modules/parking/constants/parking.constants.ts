// Lista echipamentelor pentru Probleme Parcari
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

// Lista echipamentelor pentru Prejudicii Parcari (subset)
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
  'Intretinere Parcari',
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

// Firmele care declanseaza notificari si alocare catre departamentul Intretinere Parcari
export const INTERNAL_MAINTENANCE_COMPANIES = [
  'Intretinere Parcari',
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
export const CONTROL_DEPARTMENT_NAME = 'Control';
export const MAINTENANCE_DEPARTMENT_NAME = 'Intretinere Parcari';
export const HANDICAP_PARKING_DEPARTMENT_NAME = 'Parcari Handicap';
export const DOMICILIU_PARKING_DEPARTMENT_NAME = 'Parcari Domiciliu';

// Tipuri de solicitari handicap
export const HANDICAP_REQUEST_TYPES = {
  AMPLASARE_PANOU: 'AMPLASARE_PANOU',
  REVOCARE_PANOU: 'REVOCARE_PANOU',
  CREARE_MARCAJ: 'CREARE_MARCAJ',
} as const;

export type HandicapRequestType = typeof HANDICAP_REQUEST_TYPES[keyof typeof HANDICAP_REQUEST_TYPES];

// Status pentru solicitari handicap
export const HANDICAP_REQUEST_STATUS = {
  ACTIVE: 'ACTIVE',
  FINALIZAT: 'FINALIZAT',
} as const;

export type HandicapRequestStatus = typeof HANDICAP_REQUEST_STATUS[keyof typeof HANDICAP_REQUEST_STATUS];

// Labels in limba romana pentru tipurile de solicitari handicap
export const HANDICAP_REQUEST_TYPE_LABELS: Record<HandicapRequestType, string> = {
  AMPLASARE_PANOU: 'Amplasare panou',
  REVOCARE_PANOU: 'Revocare panou',
  CREARE_MARCAJ: 'Creare marcaj',
};

// ============== PARCARI DOMICILIU ==============

// Tipuri de solicitari parcari domiciliu
export const DOMICILIU_REQUEST_TYPES = {
  TRASARE_LOCURI: 'TRASARE_LOCURI',       // Trasare locuri de parcare
  REVOCARE_LOCURI: 'REVOCARE_LOCURI',     // Revocare locuri de parcare
} as const;

export type DomiciliuRequestType = typeof DOMICILIU_REQUEST_TYPES[keyof typeof DOMICILIU_REQUEST_TYPES];

// Tipuri de parcare
export const PARKING_LAYOUT_TYPES = {
  PARALEL: 'PARALEL',
  PERPENDICULAR: 'PERPENDICULAR',
  SPIC: 'SPIC',
} as const;

export type ParkingLayoutType = typeof PARKING_LAYOUT_TYPES[keyof typeof PARKING_LAYOUT_TYPES];

export const PARKING_LAYOUT_LABELS: Record<ParkingLayoutType, string> = {
  PARALEL: 'Paralel',
  PERPENDICULAR: 'Perpendicular',
  SPIC: 'Spic',
};

// Status pentru solicitari domiciliu
export const DOMICILIU_REQUEST_STATUS = {
  ACTIVE: 'ACTIVE',
  FINALIZAT: 'FINALIZAT',
} as const;

export type DomiciliuRequestStatus = typeof DOMICILIU_REQUEST_STATUS[keyof typeof DOMICILIU_REQUEST_STATUS];

// Labels in limba romana pentru tipurile de solicitari domiciliu
export const DOMICILIU_REQUEST_TYPE_LABELS: Record<DomiciliuRequestType, string> = {
  TRASARE_LOCURI: 'Trasare locuri de parcare',
  REVOCARE_LOCURI: 'Revocare locuri de parcare',
};

// ============== LEGITIMATII HANDICAP ==============

// Status pentru legitimatii handicap
export const HANDICAP_LEGITIMATION_STATUS = {
  ACTIVE: 'ACTIVE',
  FINALIZAT: 'FINALIZAT',
} as const;

export type HandicapLegitimationStatus = typeof HANDICAP_LEGITIMATION_STATUS[keyof typeof HANDICAP_LEGITIMATION_STATUS];

// ============== LEGITIMATII REVOLUTIONAR/DEPORTAT ==============

// Status pentru legitimatii revolutionar
export const REVOLUTIONAR_LEGITIMATION_STATUS = {
  ACTIVE: 'ACTIVE',
  FINALIZAT: 'FINALIZAT',
} as const;

export type RevolutionarLegitimationStatus = typeof REVOLUTIONAR_LEGITIMATION_STATUS[keyof typeof REVOLUTIONAR_LEGITIMATION_STATUS];

// ============== DEPARTAMENTE NOI ==============

export const PROCESE_VERBALE_DEPARTMENT_NAME = 'Procese Verbale/Facturare';
export const PARCOMETRE_DEPARTMENT_NAME = 'Parcometre';
export const ACHIZITII_DEPARTMENT_NAME = 'Achizitii';

// Departamente cu dashboard simplu (program, concedii, raport zilnic)
export const SIMPLE_DASHBOARD_DEPARTMENTS = [
  'Procese Verbale/Facturare',
  'Parcometre',
  'Achizitii',
] as const;

// ============== PROCESE VERBALE / AFISARE ==============

// Status sesiune PV Display
export const PV_SESSION_STATUS = {
  DRAFT: 'DRAFT',           // Sesiunea a fost creata, zilele nu sunt complet alocate
  READY: 'READY',           // Toate zilele au 2 useri Control asignati
  IN_PROGRESS: 'IN_PROGRESS', // Cel putin o zi a inceput (azi sau trecut)
  COMPLETED: 'COMPLETED',   // Toate zilele au fost finalizate
} as const;

export type PvSessionStatus = typeof PV_SESSION_STATUS[keyof typeof PV_SESSION_STATUS];

export const PV_SESSION_STATUS_LABELS: Record<PvSessionStatus, string> = {
  DRAFT: 'Nefinalizat',
  READY: 'Pregatit',
  IN_PROGRESS: 'In Desfasurare',
  COMPLETED: 'Finalizat',
};

// Status zi PV Display
export const PV_DAY_STATUS = {
  OPEN: 'OPEN',             // Locuri libere (0/2 sau 1/2)
  ASSIGNED: 'ASSIGNED',     // 2/2 useri Control asignati
  IN_PROGRESS: 'IN_PROGRESS', // Ziua a inceput (scheduler 07:30)
  COMPLETED: 'COMPLETED',   // Finalizata de Control
} as const;

export type PvDayStatus = typeof PV_DAY_STATUS[keyof typeof PV_DAY_STATUS];

export const PV_DAY_STATUS_LABELS: Record<PvDayStatus, string> = {
  OPEN: 'Disponibil',
  ASSIGNED: 'Asignat',
  IN_PROGRESS: 'In Desfasurare',
  COMPLETED: 'Finalizat',
};

// ================ PARKING STAT LOCATIONS ================
// Locatii pentru statistici parcari etajate (tichete, abonamente, ocupare)
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
