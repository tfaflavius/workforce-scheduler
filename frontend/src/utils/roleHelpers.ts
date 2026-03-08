import type { UserRole } from '../types/user.types';

const ROLE_HIERARCHY: Record<string, number> = {
  'USER': 0,
  'MANAGER': 1,
  'ADMIN': 2,
  'MASTER_ADMIN': 3,
};

export function isRoleAtLeast(userRole: UserRole | string | undefined, minimumRole: UserRole | string): boolean {
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] ?? -1) >= (ROLE_HIERARCHY[minimumRole] ?? -1);
}

export function isAdminOrAbove(role: UserRole | string | undefined): boolean {
  return isRoleAtLeast(role, 'ADMIN');
}

export function isMasterAdmin(role: UserRole | string | undefined): boolean {
  return role === 'MASTER_ADMIN';
}
