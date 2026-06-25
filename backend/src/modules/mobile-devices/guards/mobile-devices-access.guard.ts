import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import {
  CONTROL_DEPARTMENT_NAME,
  ACHIZITII_DEPARTMENT_NAME,
} from '../../parking/constants/parking.constants';
import { removeDiacritics } from '../../../common/utils/remove-diacritics';
import { isAdminOrAbove } from '../../../common/utils/role-hierarchy';

/**
 * Acces la Dispozitive Mobile:
 * - ADMIN, MASTER_ADMIN, MANAGER: acces complet (vizualizare + editare)
 * - USER: doar daca este din departamentul Control sau Achizitii
 */
@Injectable()
export class MobileDevicesAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // ADMIN, MASTER_ADMIN si MANAGER au acces complet
    if (isAdminOrAbove(user.role) || user.role === UserRole.MANAGER) {
      return true;
    }

    // Pentru USER, verificam departamentul
    if (user.role !== UserRole.USER || !user.departmentId) {
      return false;
    }

    const department = await this.departmentRepository.findOne({
      where: { id: user.departmentId },
    });

    if (!department) {
      return false;
    }

    const deptName = removeDiacritics(department.name);
    return deptName === CONTROL_DEPARTMENT_NAME || deptName === ACHIZITII_DEPARTMENT_NAME;
  }
}
