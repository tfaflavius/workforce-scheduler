import {
  CONTROL_DEPARTMENT_NAME,
  DOMICILIU_PARKING_DEPARTMENT_NAME,
  HANDICAP_PARKING_DEPARTMENT_NAME,
  MAINTENANCE_DEPARTMENT_NAME,
  PARCOMETRE_DEPARTMENT_NAME,
  PROCESE_VERBALE_DEPARTMENT_NAME,
} from '../parking/constants/parking.constants';

/**
 * Cine vede un mesaj trimis din departamentul `from` (null = manager/admin) catre `to`.
 * Implicit: doar departamentul care trimite + cel care primeste. Exceptii:
 *  - Domiciliu <-> Handicap se vad reciproc;
 *  - Handicap/Domiciliu catre Intretinere: vad amandoua;
 *  - Control catre Intretinere: vede si Parcometre;
 *  - catre Control sau Procese Verbale/Facturare: vede si Parcometre.
 * Lucreaza pe NUMELE departamentelor.
 */
export function chatAudienceNames(from: string | null, to: string): string[] {
  const aud = new Set<string>([to]);
  if (from) aud.add(from);
  const HD = [HANDICAP_PARKING_DEPARTMENT_NAME, DOMICILIU_PARKING_DEPARTMENT_NAME];
  if (HD.includes(to)) HD.forEach((d) => aud.add(d));
  if (to === MAINTENANCE_DEPARTMENT_NAME && from && HD.includes(from))
    HD.forEach((d) => aud.add(d));
  if (to === MAINTENANCE_DEPARTMENT_NAME && from === CONTROL_DEPARTMENT_NAME) {
    aud.add(PARCOMETRE_DEPARTMENT_NAME);
  }
  if (to === CONTROL_DEPARTMENT_NAME || to === PROCESE_VERBALE_DEPARTMENT_NAME) {
    aud.add(PARCOMETRE_DEPARTMENT_NAME);
  }
  return [...aud];
}
