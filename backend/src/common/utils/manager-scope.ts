/**
 * Departamentele gestionate de un manager.
 *  - null  = fara restrictie (admin, master admin, manager pe "Toate departamentele",
 *            sau alte roluri - pentru care se aplica regulile lor proprii)
 *  - [ids] = managerul vede / gestioneaza doar angajatii din aceste departamente
 */
export function managerDeptScope(
  user?: { role?: string; managerDepartmentIds?: string[] | null } | null,
): string[] | null {
  if (!user || user.role !== 'MANAGER') return null;
  const ids = user.managerDepartmentIds;
  return Array.isArray(ids) && ids.length > 0 ? ids : null;
}

/** true daca departamentul e in aria managerului (sau daca nu exista restrictie). */
export function inManagerScope(scope: string[] | null, departmentId?: string | null): boolean {
  return !scope || (!!departmentId && scope.includes(departmentId));
}
