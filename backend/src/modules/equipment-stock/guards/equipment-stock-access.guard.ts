import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import {
  MAINTENANCE_DEPARTMENT_NAME,
  PARCOMETRE_DEPARTMENT_NAME,
} from '../../parking/constants/parking.constants';
import { StockCategory } from '../constants/equipment-stock.constants';
import { removeDiacritics } from '../../../common/utils/remove-diacritics';
import { isAdminOrAbove } from '../../../common/utils/role-hierarchy';

@Injectable()
export class EquipmentStockAccessGuard implements CanActivate {
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

    // Departamentele cu acces
    const isParcometre = deptName === PARCOMETRE_DEPARTMENT_NAME;
    const isMaintenance = deptName === MAINTENANCE_DEPARTMENT_NAME;

    if (!isParcometre && !isMaintenance) {
      return false;
    }

    // Pentru GET requests: toata lumea autorizata poate citi
    const method = request.method.toUpperCase();
    if (method === 'GET') {
      return true;
    }

    // Pentru POST/PATCH/DELETE: verificam categoria
    const category = this.extractCategory(request);

    if (!category) {
      // Daca nu putem determina categoria, permitem (validarea se face in service)
      return true;
    }

    if (isParcometre) {
      return category === StockCategory.PARCOMETRE;
    }

    if (isMaintenance) {
      return category === StockCategory.PARCARI_STRADALE;
    }

    return false;
  }

  private extractCategory(request: any): string | null {
    // Verifica body (POST/PATCH)
    if (request.body && request.body.category) {
      return request.body.category;
    }

    // Verifica query params (GET)
    if (request.query && request.query.category) {
      return request.query.category;
    }

    return null;
  }
}
