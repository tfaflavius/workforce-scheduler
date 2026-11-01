// Activitati predefinite pentru raportul zilnic, pe departament.
// Userul bifeaza cate vrea (fara minim) si, optional, bifeaza "Altele" si scrie liber.
// PROPUNERE INITIALA — se pot ajusta oricand (spune-mi ce sa schimb).
import {
  DISPECERAT_DEPARTMENT_NAME,
  CONTROL_DEPARTMENT_NAME,
  PROCESE_VERBALE_DEPARTMENT_NAME,
  PARCOMETRE_DEPARTMENT_NAME,
  ACHIZITII_DEPARTMENT_NAME,
  HANDICAP_DEPARTMENT_NAME,
  DOMICILIU_DEPARTMENT_NAME,
} from './departments';

/** Eticheta folosita pentru activitatea libera ("Altele"). */
export const OTHER_ACTIVITY_LABEL = 'Altele';

/** Prefixul liniei cu text liber in continutul compus al raportului. */
export const OTHER_CONTENT_PREFIX = 'Altele:';

/** Cele 4 activitati predefinite pe fiecare departament care trimite raport. */
export const DEPARTMENT_REPORT_ACTIVITIES: Record<string, string[]> = {
  [DISPECERAT_DEPARTMENT_NAME]: [
    'Preluare si inregistrare apeluri / sesizari',
    'Dispecerizare echipaje si monitorizare interventii',
    'Monitorizare camere / sistem si parcari',
    'Comunicare cu colegii din teren si raportare situatii',
    'Sesizare probleme si defectiuni catre intretinere si firme colaboratoare',
  ],
  [CONTROL_DEPARTMENT_NAME]: [
    'Verificare parcari si legalitate stationare',
    'Intocmire note de constatare / amenzi',
    'Semnalare sesizari (marcaje, panouri, defectiuni)',
    'Deplasare pe zonele repartizate',
  ],
  [ACHIZITII_DEPARTMENT_NAME]: [
    'Contactare furnizori si cerere oferte',
    'Receptie marfa si verificare documente',
    'Inregistrare facturi si comenzi',
    'Gestionare stoc si aprovizionare',
  ],
  [PARCOMETRE_DEPARTMENT_NAME]: [
    'Verificare si intretinere parcometre',
    'Colectare numerar din aparate',
    'Semnalare / remediere defectiuni',
    'Verificare serii / terminale si stoc echipamente',
    'Verificare si gestionare aplicatie de control si controlori',
  ],
  [HANDICAP_DEPARTMENT_NAME]: [
    'Verificare solicitari loc parcare handicap',
    'Verificare legitimatii si documente',
    'Deplasare pe teren pentru constatari',
    'Actualizare evidenta si finalizare cereri',
  ],
  [DOMICILIU_DEPARTMENT_NAME]: [
    'Verificare solicitari parcare domiciliu',
    'Verificare documente si eligibilitate',
    'Deplasare pe teren pentru constatari',
    'Actualizare evidenta si finalizare cereri',
    'Programare licitatii',
  ],
  [PROCESE_VERBALE_DEPARTMENT_NAME]: [
    'Intocmire procese verbale',
    'Facturare si emitere documente',
    'Verificare si afisare procese verbale',
    'Comunicare cu contribuabilii / clientii',
  ],
};

/** Intoarce activitatile predefinite pentru un departament (sau [] daca nu are). */
export function getActivitiesForDepartment(departmentName?: string | null): string[] {
  if (!departmentName) return [];
  return DEPARTMENT_REPORT_ACTIVITIES[departmentName] || [];
}

/** Compune continutul raportului (text) din activitatile bifate + textul optional "Altele". */
export function composeReportContent(selected: string[], otherText: string): string {
  const lines = selected.map((a) => `- ${a}`);
  const trimmed = otherText.trim();
  if (trimmed) lines.push(`${OTHER_CONTENT_PREFIX} ${trimmed}`);
  return lines.join('\n');
}

/**
 * Reface starea (activitati bifate + text liber) dintr-un continut compus anterior.
 * Folosit la editarea unui draft. Liniile care nu corespund activitatilor predefinite
 * ajung in textul "Altele" (ca sa nu se piarda nimic).
 */
export function parseReportContent(
  content: string | undefined | null,
  activities: string[],
): { selected: string[]; otherText: string } {
  const selected: string[] = [];
  const otherLines: string[] = [];
  if (!content) return { selected, otherText: '' };

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith(OTHER_CONTENT_PREFIX)) {
      const rest = line.slice(OTHER_CONTENT_PREFIX.length).trim();
      if (rest) otherLines.push(rest);
      continue;
    }
    const normalized = line.replace(/^-\s*/, '');
    const match = activities.find((a) => a === normalized);
    if (match) {
      if (!selected.includes(match)) selected.push(match);
    } else {
      otherLines.push(normalized);
    }
  }

  return { selected, otherText: otherLines.join('\n') };
}
