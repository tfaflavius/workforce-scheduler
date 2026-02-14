import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import {
  MAINTENANCE_DEPARTMENT_NAME,
  HANDICAP_PARKING_DEPARTMENT_NAME,
  DOMICILIU_PARKING_DEPARTMENT_NAME,
} from '../constants/parking.constants';
import { removeDiacritics } from '../../../common/utils/remove-diacritics';

@Injectable()
export class HandicapAccessGuard implements CanActivate {
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

    // Pentru USER, verificam daca e din departamentele cu acces la parcari handicap
    if (user.departmentId) {
      const department = await this.departmentRepository.findOne({
        where: { id: user.departmentId },
      });

      if (department) {
        // Permite acces pentru Intretinere Parcari, Parcari Handicap, Parcari Domiciliu
        const allowedDepartments = [
          MAINTENANCE_DEPARTMENT_NAME,
          HANDICAP_PARKING_DEPARTMENT_NAME,
          DOMICILIU_PARKING_DEPARTMENT_NAME,
        ];
        if (allowedDepartments.includes(removeDiacritics(department.name))) {
          return true;
        }
      }
    }

    return false;
  }
}
