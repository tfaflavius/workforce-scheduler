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
