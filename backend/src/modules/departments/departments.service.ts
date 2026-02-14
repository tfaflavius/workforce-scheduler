import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { removeDiacritics } from '../../common/utils/remove-diacritics';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    if (createDepartmentDto.name) {
      createDepartmentDto.name = removeDiacritics(createDepartmentDto.name);
    }
    const department = this.departmentRepository.create(createDepartmentDto);
    return this.departmentRepository.save(department);
  }

  async findAll(): Promise<Department[]> {
    return this.departmentRepository.find({
      relations: ['manager', 'parentDepartment'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['manager', 'parentDepartment'],
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto): Promise<Department> {
    if (updateDepartmentDto.name) {
      updateDepartmentDto.name = removeDiacritics(updateDepartmentDto.name);
    }
    const department = await this.findOne(id);
    Object.assign(department, updateDepartmentDto);
    return this.departmentRepository.save(department);
  }

  async remove(id: string): Promise<void> {
    const department = await this.findOne(id);
    await this.departmentRepository.remove(department);
  }
}
