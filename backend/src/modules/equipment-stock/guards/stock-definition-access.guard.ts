import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { PARCOMETRE_DEPARTMENT_NAME } from '../../parking/constants/parking.constants';
import { removeDiacritics } from '../../../common/utils/remove-diacritics';
import { isAdminOrAbove } from '../../../common/utils/role-hierarchy';

/**
 * Acces la gestionarea definitiilor de stoc (creare/editare/stergere):
 * - ADMIN, MASTER_ADMIN, MANAGER: acces complet
 * - USER: doar daca este din departamentul Parcometre
 */
@Injectable()
export class StockDefinitionAccessGuard implements CanActivate {
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

    // Pentru USER, doar departamentul Parcometre
    if (user.role !== UserRole.USER || !user.departmentId) {
      return false;
    }

    const department = await this.departmentRepository.findOne({
      where: { id: user.departmentId },
    });

    if (!department) {
      return false;
    }

    return removeDiacritics(department.name) === PARCOMETRE_DEPARTMENT_NAME;
  }
}
