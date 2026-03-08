import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Role hierarchy: higher index = higher privilege
const ROLE_HIERARCHY: UserRole[] = [
  UserRole.USER,
  UserRole.MANAGER,
  UserRole.ADMIN,
  UserRole.MASTER_ADMIN,
];

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const userRoleIndex = ROLE_HIERARCHY.indexOf(user.role);

    // User passes if their role is at or above ANY of the required roles
    return requiredRoles.some((role) => {
      const requiredIndex = ROLE_HIERARCHY.indexOf(role);
      return userRoleIndex >= requiredIndex;
    });
  }
}
