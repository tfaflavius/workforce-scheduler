import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import {
  PROCESE_VERBALE_DEPARTMENT_NAME,
  CONTROL_DEPARTMENT_NAME,
} from '../constants/parking.constants';
import { removeDiacritics } from '../../../common/utils/remove-diacritics';

@Injectable()
export class PvDisplayAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // ADMIN si MANAGER au acces direct
    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
      return true;
    }

    // Pentru USER, verificam daca e din departamentele cu acces
    if (user.departmentId) {
      const department = await this.departmentRepository.findOne({
        where: { id: user.departmentId },
      });

      if (department) {
        // Permite acces pentru Procese Verbale/Facturare si Control
        const allowedDepartments = [
          PROCESE_VERBALE_DEPARTMENT_NAME,
          CONTROL_DEPARTMENT_NAME,
        ];
        if (allowedDepartments.includes(removeDiacritics(department.name))) {
          return true;
        }
      }
    }

    return false;
  }
}
