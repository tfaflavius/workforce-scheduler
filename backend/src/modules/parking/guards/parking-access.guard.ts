import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { DISPECERAT_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME } from '../constants/parking.constants';

@Injectable()
export class ParkingAccessGuard implements CanActivate {
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

    // ADMIN și MANAGER au acces direct
    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
      return true;
    }

    // Pentru USER, verificăm dacă e din departamentele cu acces la parcări
    if (user.departmentId) {
      const department = await this.departmentRepository.findOne({
        where: { id: user.departmentId },
      });

      if (department) {
        // Permite acces pentru Dispecerat și Întreținere Parcări
        const allowedDepartments = [DISPECERAT_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME];
        if (allowedDepartments.includes(department.name)) {
          return true;
        }
      }
    }

    return false;
  }
}
