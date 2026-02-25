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

// ============== CONTROL SESIZARI ==============

// Tipuri de sesizari control
export const CONTROL_SESIZARE_TYPES = {
  MARCAJ: 'MARCAJ',
  PANOU: 'PANOU',
} as const;

export type ControlSesizareType = typeof CONTROL_SESIZARE_TYPES[keyof typeof CONTROL_SESIZARE_TYPES];

// Status pentru sesizari control
export const CONTROL_SESIZARE_STATUS = {
  ACTIVE: 'ACTIVE',
  FINALIZAT: 'FINALIZAT',
} as const;

export type ControlSesizareStatus = typeof CONTROL_SESIZARE_STATUS[keyof typeof CONTROL_SESIZARE_STATUS];

// Labels in limba romana pentru tipurile de sesizari
export const CONTROL_SESIZARE_TYPE_LABELS: Record<ControlSesizareType, string> = {
  MARCAJ: 'Marcaj',
  PANOU: 'Panou',
};

// Zone pentru sesizari control (rosu, galben, alb)
export const CONTROL_SESIZARE_ZONES = {
  ROSU: 'ROSU',
  GALBEN: 'GALBEN',
  ALB: 'ALB',
} as const;

export type ControlSesizareZone = typeof CONTROL_SESIZARE_ZONES[keyof typeof CONTROL_SESIZARE_ZONES];

export const CONTROL_SESIZARE_ZONE_LABELS: Record<ControlSesizareZone, string> = {
  ROSU: 'Rosu',
  GALBEN: 'Galben',
  ALB: 'Alb',
};

// ================ PARKING STAT LOCATIONS ================
// Locatii pentru statistici parcari etajate (tichete, ocupare) — Doja cu sub-niveluri
export const PARKING_STAT_LOCATIONS = [
  { key: 'INDEPENDENTEI', name: 'Parcarea Independentei', group: null },
  { key: 'BRASOVULUI', name: 'Parcarea Brasovului', group: null },
  { key: 'PRIMARIE', name: 'Parcarea Primarie', group: null },
  { key: 'BARITIU', name: 'Parcarea Baritiu', group: null },
  { key: 'SPITAL_MUNICIPAL', name: 'Parcarea Spital Municipal', group: null },
  { key: 'TRIBUNALULUI', name: 'Parcarea Tribunalului', group: null },
  { key: 'IOSIF_VULCAN', name: 'Parcarea Iosif Vulcan', group: null },
  { key: 'CETATE', name: 'Parcarea Cetate', group: null },
  { key: 'DOJA_P0', name: 'P0', group: 'Parcarea Doja' },
  { key: 'DOJA_P1', name: 'P1', group: 'Parcarea Doja' },
  { key: 'DOJA_P2', name: 'P2', group: 'Parcarea Doja' },
  { key: 'DOJA_P3P4', name: 'P3+P4', group: 'Parcarea Doja' },
] as const;

export type ParkingStatLocationKey = typeof PARKING_STAT_LOCATIONS[number]['key'];

// Locatii pentru abonamente lunare — Doja ca o singura parcare (fara sub-niveluri)
export const PARKING_SUBSCRIPTION_LOCATIONS = [
  { key: 'INDEPENDENTEI', name: 'Parcarea Independentei' },
  { key: 'BRASOVULUI', name: 'Parcarea Brasovului' },
  { key: 'PRIMARIE', name: 'Parcarea Primarie' },
  { key: 'BARITIU', name: 'Parcarea Baritiu' },
  { key: 'SPITAL_MUNICIPAL', name: 'Parcarea Spital Municipal' },
  { key: 'TRIBUNALULUI', name: 'Parcarea Tribunalului' },
  { key: 'IOSIF_VULCAN', name: 'Parcarea Iosif Vulcan' },
  { key: 'CETATE', name: 'Parcarea Cetate' },
  { key: 'DOJA', name: 'Parcarea Doja' },
] as const;

export type ParkingSubscriptionLocationKey = typeof PARKING_SUBSCRIPTION_LOCATIONS[number]['key'];
