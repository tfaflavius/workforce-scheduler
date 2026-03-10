export interface ResourceDefinition {
  key: string;
  label: string;
  section: string;
  actions: string[];
}

export const RESOURCE_DEFINITIONS: ResourceDefinition[] = [
  // Principal
  { key: 'dashboard', label: 'Dashboard', section: 'Principal', actions: ['view'] },
  { key: 'my-schedule', label: 'Programul Meu', section: 'Principal', actions: ['view'] },
  { key: 'daily-reports', label: 'Raport Zilnic', section: 'Principal', actions: ['view', 'create', 'edit'] },

  // Operatiuni
  { key: 'shift-swaps', label: 'Schimburi Ture', section: 'Operatiuni', actions: ['view', 'create'] },
  { key: 'leave-requests', label: 'Concedii', section: 'Operatiuni', actions: ['view', 'create'] },
  { key: 'schedules', label: 'Programe', section: 'Operatiuni', actions: ['view', 'create', 'edit', 'delete'] },

  // Administrare
  { key: 'shift-swaps.admin', label: 'Gestionare Schimburi', section: 'Administrare', actions: ['view', 'approve'] },
  { key: 'leave-requests.admin', label: 'Gestionare Concedii', section: 'Administrare', actions: ['view', 'approve'] },
  { key: 'reports', label: 'Rapoarte', section: 'Administrare', actions: ['view'] },
  { key: 'users', label: 'Utilizatori', section: 'Administrare', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'time-tracking', label: 'Monitorizare Pontaj', section: 'Administrare', actions: ['view', 'edit'] },
  { key: 'permissions', label: 'Permisiuni', section: 'Administrare', actions: ['view', 'edit'] },

  // Parcari
  { key: 'parking.issues', label: 'Parcari Etajate - Probleme', section: 'Parcari', actions: ['view', 'create', 'edit', 'resolve'] },
  { key: 'parking.damages', label: 'Parcari Etajate - Prejudicii', section: 'Parcari', actions: ['view', 'create', 'edit', 'resolve'] },
  { key: 'parking.payment-machines', label: 'Parcari Etajate - Automate Plata', section: 'Parcari', actions: ['view', 'create', 'edit'] },
  { key: 'parking.stats', label: 'Parcari Etajate - Statistici', section: 'Parcari', actions: ['view', 'edit'] },
  { key: 'parking.handicap', label: 'Parcari Handicap', section: 'Parcari', actions: ['view', 'create', 'edit', 'resolve'] },
  { key: 'parking.domiciliu', label: 'Parcari Domiciliu', section: 'Parcari', actions: ['view', 'create', 'edit', 'resolve'] },
  { key: 'pv-facturare', label: 'PV / Facturare', section: 'Parcari', actions: ['view', 'create', 'edit'] },
  { key: 'parcometre', label: 'Parcometre', section: 'Parcari', actions: ['view', 'create', 'edit'] },
  { key: 'achizitii', label: 'Achizitii', section: 'Parcari', actions: ['view', 'create', 'edit'] },
  { key: 'incasari-cheltuieli', label: 'Incasari / Cheltuieli', section: 'Parcari', actions: ['view', 'create', 'edit'] },
  { key: 'control-sesizari', label: 'Control Sesizari', section: 'Parcari', actions: ['view', 'create', 'resolve'] },
];

export const ACTION_LABELS: Record<string, string> = {
  view: 'Vizualizare',
  create: 'Creare',
  edit: 'Editare',
  delete: 'Stergere',
  resolve: 'Rezolvare',
  approve: 'Aprobare',
};

export const SECTION_LABELS: Record<string, string> = {
  Principal: 'Principal',
  Operatiuni: 'Operatiuni',
  Administrare: 'Administrare',
  Parcari: 'Parcari',
};

export const SECTIONS = ['Principal', 'Operatiuni', 'Administrare', 'Parcari'] as const;

export const ROLES: Array<{ key: string; label: string }> = [
  { key: 'MASTER_ADMIN', label: 'Master Admin' },
  { key: 'ADMIN', label: 'Administrator' },
  { key: 'MANAGER', label: 'Manager' },
  { key: 'USER', label: 'Utilizator' },
];

export const TASK_TYPE_DEFINITIONS = [
  { key: 'parking_issue', label: 'Probleme Parcari' },
  { key: 'parking_damage', label: 'Prejudicii Parcari' },
  { key: 'handicap_request', label: 'Solicitari Handicap' },
  { key: 'domiciliu_request', label: 'Solicitari Domiciliu' },
  { key: 'leave_request', label: 'Cereri Concediu' },
  { key: 'shift_swap', label: 'Schimburi Ture' },
  { key: 'control_sesizare', label: 'Sesizari Control' },
];

export const TASK_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TASK_TYPE_DEFINITIONS.map(t => [t.key, t.label]),
);

// Maps task types to their associated resource keys for quick-grant
export const TASK_TYPE_RESOURCE_MAP: Record<string, string[]> = {
  parking_issue: ['parking.issues'],
  parking_damage: ['parking.damages'],
  handicap_request: ['parking.handicap'],
  domiciliu_request: ['parking.domiciliu'],
  leave_request: ['leave-requests'],
  shift_swap: ['shift-swaps'],
  control_sesizare: ['control-sesizari'],
};

// Romanian labels for flow steps
export const FLOW_STEP_LABELS = {
  creator: { label: 'Creaza', description: 'Creaza si trimite' },
  receiver: { label: 'Primeste', description: 'Primeste si lucreaza' },
  resolver: { label: 'Rezolva', description: 'Rezolva si finalizeaza' },
} as const;

// Status progression for task flows
export const FLOW_STATUS_STEPS = ['ACTIV', 'IN LUCRU', 'FINALIZAT'] as const;

// ─── Email Notification Rules ───────────────────────────────

export const EMAIL_EVENT_TYPES = [
  { key: 'parking_issue', label: 'Probleme Parcari' },
  { key: 'parking_damage', label: 'Prejudicii Parcari' },
  { key: 'handicap_request', label: 'Solicitari Handicap' },
  { key: 'domiciliu_request', label: 'Solicitari Domiciliu' },
  { key: 'control_sesizare', label: 'Sesizari Control' },
  { key: 'leave_request', label: 'Cereri Concediu' },
  { key: 'shift_swap', label: 'Schimburi Ture' },
  { key: 'schedule', label: 'Program' },
  { key: 'daily_report', label: 'Raport Zilnic' },
  { key: 'weekly_report', label: 'Raport Saptamanal' },
  { key: 'unresolved_reminder', label: 'Reminder Nerezolvate' },
  { key: 'welcome', label: 'Cont Nou' },
  { key: 'password_reset', label: 'Resetare Parola' },
] as const;

export const EMAIL_EVENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EMAIL_EVENT_TYPES.map((t) => [t.key, t.label]),
);

export const EMAIL_EVENT_ACTIONS = [
  { key: 'created', label: 'Creare' },
  { key: 'resolved', label: 'Rezolvare' },
  { key: 'approved', label: 'Aprobare' },
  { key: 'rejected', label: 'Respingere' },
  { key: 'accepted', label: 'Acceptare' },
  { key: 'declined', label: 'Refuzare' },
  { key: 'reminder', label: 'Reminder' },
  { key: 'report', label: 'Raport' },
  { key: 'updated', label: 'Actualizare' },
  { key: 'final_approval', label: 'Aprobare Finala' },
] as const;

export const EMAIL_EVENT_ACTION_LABELS: Record<string, string> = Object.fromEntries(
  EMAIL_EVENT_ACTIONS.map((a) => [a.key, a.label]),
);

export const EMAIL_RECIPIENT_TYPES = [
  { key: 'ROLE', label: 'Rol Specific' },
  { key: 'DEPARTMENT', label: 'Departament' },
  { key: 'CREATOR', label: 'Creatorul' },
  { key: 'ASSIGNED', label: 'Angajatul Asignat' },
  { key: 'ADMIN_ALL', label: 'Toti Adminii' },
  { key: 'MANAGER_ALL', label: 'Toti Managerii' },
] as const;

export const EMAIL_RECIPIENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EMAIL_RECIPIENT_TYPES.map((r) => [r.key, r.label]),
);

// Color map for event type chips
export const EMAIL_EVENT_TYPE_COLORS: Record<string, 'error' | 'warning' | 'info' | 'success' | 'secondary' | 'primary' | 'default'> = {
  parking_issue: 'error',
  parking_damage: 'error',
  handicap_request: 'info',
  domiciliu_request: 'info',
  control_sesizare: 'warning',
  leave_request: 'success',
  shift_swap: 'success',
  schedule: 'primary',
  daily_report: 'secondary',
  weekly_report: 'secondary',
  unresolved_reminder: 'warning',
  welcome: 'primary',
  password_reset: 'default',
};

// ─── Notification Settings ───────────────────────────────

export interface NotificationTypeDefinition {
  key: string;
  label: string;
  category: string;
}

export const NOTIFICATION_CATEGORIES = [
  'Programe',
  'Ture',
  'Concedii',
  'Parcari',
  'Rapoarte',
  'Sistem',
] as const;

export const NOTIFICATION_CATEGORY_LABELS: Record<string, string> = {
  Programe: 'Programe',
  Ture: 'Ture',
  Concedii: 'Concedii',
  Parcari: 'Parcari',
  Rapoarte: 'Rapoarte',
  Sistem: 'Sistem',
};

export const NOTIFICATION_TYPE_DEFINITIONS: NotificationTypeDefinition[] = [
  // Programe
  { key: 'SCHEDULE_CREATED', label: 'Program creat', category: 'Programe' },
  { key: 'SCHEDULE_UPDATED', label: 'Program actualizat', category: 'Programe' },
  { key: 'SCHEDULE_APPROVED', label: 'Program aprobat', category: 'Programe' },
  { key: 'SCHEDULE_REJECTED', label: 'Program respins', category: 'Programe' },
  // Ture
  { key: 'SHIFT_REMINDER', label: 'Reminder tura', category: 'Ture' },
  { key: 'SHIFT_SWAP_REQUEST', label: 'Cerere schimb tura', category: 'Ture' },
  { key: 'SHIFT_SWAP_RESPONSE', label: 'Raspuns schimb tura', category: 'Ture' },
  { key: 'SHIFT_SWAP_APPROVED', label: 'Schimb tura aprobat', category: 'Ture' },
  { key: 'SHIFT_SWAP_REJECTED', label: 'Schimb tura respins', category: 'Ture' },
  { key: 'SHIFT_SWAP_ACCEPTED', label: 'Schimb tura acceptat', category: 'Ture' },
  { key: 'EMPLOYEE_ABSENT', label: 'Angajat absent', category: 'Ture' },
  // Concedii
  { key: 'LEAVE_REQUEST_CREATED', label: 'Cerere concediu creata', category: 'Concedii' },
  { key: 'LEAVE_REQUEST_APPROVED', label: 'Concediu aprobat', category: 'Concedii' },
  { key: 'LEAVE_REQUEST_REJECTED', label: 'Concediu respins', category: 'Concedii' },
  { key: 'LEAVE_OVERLAP_WARNING', label: 'Avertizare suprapunere', category: 'Concedii' },
  // Parcari
  { key: 'PARKING_ISSUE_ASSIGNED', label: 'Problema parcari asignata', category: 'Parcari' },
  { key: 'PARKING_ISSUE_RESOLVED', label: 'Problema parcari rezolvata', category: 'Parcari' },
  { key: 'PARKING_DAMAGE_ASSIGNED', label: 'Prejudiciu parcari asignat', category: 'Parcari' },
  { key: 'PARKING_DAMAGE_RESOLVED', label: 'Prejudiciu parcari rezolvat', category: 'Parcari' },
  { key: 'HANDICAP_REQUEST_ASSIGNED', label: 'Solicitare handicap asignata', category: 'Parcari' },
  { key: 'HANDICAP_REQUEST_RESOLVED', label: 'Solicitare handicap rezolvata', category: 'Parcari' },
  { key: 'DOMICILIU_REQUEST_ASSIGNED', label: 'Solicitare domiciliu asignata', category: 'Parcari' },
  { key: 'DOMICILIU_REQUEST_RESOLVED', label: 'Solicitare domiciliu rezolvata', category: 'Parcari' },
  { key: 'LEGITIMATION_ASSIGNED', label: 'Legitimatie asignata', category: 'Parcari' },
  { key: 'LEGITIMATION_RESOLVED', label: 'Legitimatie rezolvata', category: 'Parcari' },
  { key: 'PV_SESSION_ASSIGNED', label: 'Sesiune PV asignata', category: 'Parcari' },
  { key: 'PV_SESSION_UPDATED', label: 'Sesiune PV actualizata', category: 'Parcari' },
  { key: 'CONTROL_SESIZARE_ASSIGNED', label: 'Sesizare control asignata', category: 'Parcari' },
  { key: 'CONTROL_SESIZARE_RESOLVED', label: 'Sesizare control rezolvata', category: 'Parcari' },
  // Rapoarte
  { key: 'DAILY_REPORT_SUBMITTED', label: 'Raport zilnic trimis', category: 'Rapoarte' },
  { key: 'DAILY_REPORT_COMMENTED', label: 'Comentariu raport zilnic', category: 'Rapoarte' },
  { key: 'DAILY_REPORT_MISSING', label: 'Raport zilnic lipsa', category: 'Rapoarte' },
  { key: 'EDIT_REQUEST_CREATED', label: 'Cerere editare creata', category: 'Rapoarte' },
  { key: 'EDIT_REQUEST_APPROVED', label: 'Cerere editare aprobata', category: 'Rapoarte' },
  { key: 'EDIT_REQUEST_REJECTED', label: 'Cerere editare respinsa', category: 'Rapoarte' },
  // Sistem
  { key: 'GENERAL', label: 'Notificare generala', category: 'Sistem' },
  { key: 'TIME_ENTRY_MISMATCH', label: 'Nepotrivire pontaj', category: 'Sistem' },
  { key: 'GPS_STATUS_ALERT', label: 'Alerta status GPS', category: 'Sistem' },
];

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  NOTIFICATION_TYPE_DEFINITIONS.map((t) => [t.key, t.label]),
);

export const NOTIFICATION_CATEGORY_COLORS: Record<string, 'primary' | 'warning' | 'success' | 'error' | 'info' | 'secondary'> = {
  Programe: 'primary',
  Ture: 'warning',
  Concedii: 'success',
  Parcari: 'error',
  Rapoarte: 'info',
  Sistem: 'secondary',
};
