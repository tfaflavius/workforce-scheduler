import { UserRole } from '../../modules/users/entities/user.entity';

// Role hierarchy: higher index = higher privilege
const ROLE_HIERARCHY: UserRole[] = [
  UserRole.USER,
  UserRole.MANAGER,
  UserRole.ADMIN,
  UserRole.MASTER_ADMIN,
];

export function isRoleAtLeast(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minimumRole);
}

export function isAdminOrAbove(role: UserRole): boolean {
  return isRoleAtLeast(role, UserRole.ADMIN);
}
