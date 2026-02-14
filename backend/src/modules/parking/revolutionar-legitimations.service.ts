import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevolutionarLegitimation } from './entities/revolutionar-legitimation.entity';
import { RevolutionarLegitimationComment } from './entities/revolutionar-legitimation-comment.entity';
import { ParkingHistory } from './entities/parking-history.entity';
import { CreateRevolutionarLegitimationDto } from './dto/create-revolutionar-legitimation.dto';
import { UpdateRevolutionarLegitimationDto } from './dto/update-revolutionar-legitimation.dto';
import { ResolveHandicapLegitimationDto } from './dto/resolve-handicap-legitimation.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import {
  HANDICAP_PARKING_DEPARTMENT_NAME,
  RevolutionarLegitimationStatus,
} from './constants/parking.constants';
import { removeDiacritics } from '../../common/utils/remove-diacritics';

@Injectable()
export class RevolutionarLegitimationsService {
  constructor(
    @InjectRepository(RevolutionarLegitimation)
    private readonly legitimationRepository: Repository<RevolutionarLegitimation>,
    @InjectRepository(RevolutionarLegitimationComment)
    private readonly commentRepository: Repository<RevolutionarLegitimationComment>,
    @InjectRepository(ParkingHistory)
    private readonly historyRepository: Repository<ParkingHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateRevolutionarLegitimationDto): Promise<RevolutionarLegitimation> {
    const legitimation = this.legitimationRepository.create({
      personName: removeDiacritics(dto.personName),
      cnp: dto.cnp,
      lawNumber: dto.lawNumber,
      carPlate: dto.carPlate,
      autoNumber: dto.autoNumber,
      phone: dto.phone,
      description: dto.description ? removeDiacritics(dto.description) : dto.description,
      createdBy: userId,
      lastModifiedBy: userId,
      status: 'ACTIVE' as RevolutionarLegitimationStatus,
    });

    const savedLegitimation = await this.legitimationRepository.save(legitimation);

    // Inregistreaza in history
    await this.recordHistory(savedLegitimation.id, 'CREATED', userId, {
      personName: dto.personName,
      carPlate: dto.carPlate,
    });

    // Notifica departamentul Parcari Handicap
    await this.notifyHandicapDepartment(savedLegitimation, userId);

    return this.findOne(savedLegitimation.id);
  }

  async update(id: string, userId: string, dto: UpdateRevolutionarLegitimationDto, user: any): Promise<RevolutionarLegitimation> {
    // Admin si userii de la departamentul Parcari Handicap pot edita
    const canEdit = user.role === UserRole.ADMIN ||
      removeDiacritics(user.department?.name || '') === HANDICAP_PARKING_DEPARTMENT_NAME;

    if (!canEdit) {
      throw new ForbiddenException('Doar administratorii si departamentul Parcari Handicap pot modifica legitimatiile');
    }

    const legitimation = await this.findOne(id);

    const changes: Record<string, any> = {};

    if (dto.personName && dto.personName !== legitimation.personName) {
      changes.personName = { from: legitimation.personName, to: dto.personName };
      legitimation.personName = dto.personName;
    }
    if (dto.cnp !== undefined && dto.cnp !== legitimation.cnp) {
      changes.cnp = { from: legitimation.cnp, to: dto.cnp };
      legitimation.cnp = dto.cnp;
    }
    if (dto.lawNumber && dto.lawNumber !== legitimation.lawNumber) {
      changes.lawNumber = { from: legitimation.lawNumber, to: dto.lawNumber };
      legitimation.lawNumber = dto.lawNumber;
    }
    if (dto.carPlate && dto.carPlate !== legitimation.carPlate) {
      changes.carPlate = { from: legitimation.carPlate, to: dto.carPlate };
      legitimation.carPlate = dto.carPlate;
    }
    if (dto.autoNumber !== undefined && dto.autoNumber !== legitimation.autoNumber) {
      changes.autoNumber = { from: legitimation.autoNumber, to: dto.autoNumber };
      legitimation.autoNumber = dto.autoNumber;
    }
    if (dto.phone !== undefined && dto.phone !== legitimation.phone) {
      changes.phone = { from: legitimation.phone, to: dto.phone };
      legitimation.phone = dto.phone;
    }
    if (dto.description !== undefined && dto.description !== legitimation.description) {
      changes.description = { from: legitimation.description, to: dto.description };
      legitimation.description = dto.description;
    }

    legitimation.lastModifiedBy = userId;

    await this.legitimationRepository.save(legitimation);

    // Inregistreaza in history
    if (Object.keys(changes).length > 0) {
      await this.recordHistory(id, 'UPDATED', userId, changes);
    }

    return this.findOne(id);
  }

  private async recordHistory(
    entityId: string,
    action: 'CREATED' | 'UPDATED' | 'RESOLVED' | 'DELETED',
    userId: string,
    changes?: Record<string, any>,
  ): Promise<void> {
    const history = this.historyRepository.create({
      entityType: 'REVOLUTIONAR_LEGITIMATION',
      entityId,
      action,
      userId,
      changes,
    });
    await this.historyRepository.save(history);
  }

  private async notifyHandicapDepartment(legitimation: RevolutionarLegitimation, creatorUserId: string): Promise<void> {
    // Gaseste departamentul Parcari Handicap
    const handicapDept = await this.departmentRepository.findOne({
      where: { name: HANDICAP_PARKING_DEPARTMENT_NAME },
    });

    if (!handicapDept) {
      return;
    }

    // Gaseste toti userii din departamentul Parcari Handicap
    const handicapUsers = await this.userRepository.find({
      where: {
        departmentId: handicapDept.id,
        isActive: true,
      },
    });

    // Adauga si adminii
    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
    });

    const allUsers = [...handicapUsers, ...admins].filter(
      (user, index, self) => index === self.findIndex(u => u.id === user.id) && user.id !== creatorUserId
    );

    if (allUsers.length === 0) {
      return;
    }

    // Obtine creatorul
    const creator = await this.userRepository.findOne({ where: { id: creatorUserId } });
    const creatorName = creator?.fullName || 'Un utilizator';

    // Trimite notificari in-app (email-urile se trimit doar in digest-ul zilnic)
    const notifications = allUsers.map(user => ({
      userId: user.id,
      type: NotificationType.PARKING_ISSUE_ASSIGNED,
      title: 'Solicitare legitimatie revolutionar/deportat noua',
      message: `O noua solicitare de legitimatie pentru ${legitimation.personName} (${legitimation.carPlate}) a fost creata de ${creatorName}.`,
      data: {
        revolutionarLegitimationId: legitimation.id,
        personName: legitimation.personName,
        carPlate: legitimation.carPlate,
      },
    }));

    await this.notificationsService.createMany(notifications);
  }

  private async notifyOnResolution(legitimation: RevolutionarLegitimation, resolverUserId: string): Promise<void> {
    const resolver = await this.userRepository.findOne({ where: { id: resolverUserId } });
    const resolverName = resolver?.fullName || 'Un utilizator';

    // Lista utilizatorilor care trebuie notificati
    const usersToNotify: User[] = [];

    // 1. Creatorul legitimatiei
    if (legitimation.createdBy !== resolverUserId) {
      const creator = await this.userRepository.findOne({ where: { id: legitimation.createdBy } });
      if (creator) {
        usersToNotify.push(creator);
      }
    }

    // 2. Toti userii din Parcari Handicap
    const handicapDept = await this.departmentRepository.findOne({
      where: { name: HANDICAP_PARKING_DEPARTMENT_NAME },
    });
    if (handicapDept) {
      const handicapUsers = await this.userRepository.find({
        where: { departmentId: handicapDept.id, isActive: true },
      });
      usersToNotify.push(...handicapUsers.filter(u => u.id !== resolverUserId));
    }

    // 3. Toti adminii
    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
    });
    usersToNotify.push(...admins.filter(u => u.id !== resolverUserId));

    // Elimina duplicatele
    const uniqueUsers = usersToNotify.filter((user, index, self) =>
      index === self.findIndex(u => u.id === user.id)
    );

    if (uniqueUsers.length === 0) {
      return;
    }

    // Trimite notificari in-app (email-urile se trimit doar in digest-ul zilnic)
    const notifications = uniqueUsers.map(user => ({
      userId: user.id,
      type: NotificationType.PARKING_ISSUE_RESOLVED,
      title: 'Legitimatie revolutionar/deportat finalizata',
      message: `Legitimatia pentru ${legitimation.personName} a fost finalizata de ${resolverName}.`,
      data: {
        revolutionarLegitimationId: legitimation.id,
        personName: legitimation.personName,
        resolutionDescription: legitimation.resolutionDescription,
      },
    }));

    await this.notificationsService.createMany(notifications);
  }

  async findAll(status?: RevolutionarLegitimationStatus): Promise<RevolutionarLegitimation[]> {
    const query = this.legitimationRepository.createQueryBuilder('legitimation')
      .leftJoinAndSelect('legitimation.creator', 'creator')
      .leftJoinAndSelect('legitimation.resolver', 'resolver')
      .leftJoinAndSelect('legitimation.lastModifier', 'lastModifier');

    if (status) {
      query.andWhere('legitimation.status = :status', { status });
    }

    return query.orderBy('legitimation.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<RevolutionarLegitimation> {
    const legitimation = await this.legitimationRepository.findOne({
      where: { id },
      relations: ['creator', 'resolver', 'lastModifier', 'comments', 'comments.user'],
    });

    if (!legitimation) {
      throw new NotFoundException(`Legitimatia cu ID ${id} nu a fost gasita`);
    }

    return legitimation;
  }

  async getHistory(id: string): Promise<ParkingHistory[]> {
    return this.historyRepository.find({
      where: { entityType: 'REVOLUTIONAR_LEGITIMATION', entityId: id },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async resolve(id: string, userId: string, dto: ResolveHandicapLegitimationDto): Promise<RevolutionarLegitimation> {
    const legitimation = await this.findOne(id);

    if (legitimation.status === 'FINALIZAT') {
      throw new ForbiddenException('Aceasta legitimatie este deja finalizata');
    }

    legitimation.status = 'FINALIZAT';
    legitimation.resolutionDescription = dto.resolutionDescription;
    legitimation.resolvedBy = userId;
    legitimation.lastModifiedBy = userId;
    legitimation.resolvedAt = new Date();

    await this.legitimationRepository.save(legitimation);

    // Inregistreaza in history
    await this.recordHistory(id, 'RESOLVED', userId, {
      resolutionDescription: dto.resolutionDescription,
    });

    // Notifica toate partile implicate
    await this.notifyOnResolution(legitimation, userId);

    return this.findOne(id);
  }

  async addComment(legitimationId: string, userId: string, dto: CreateCommentDto): Promise<RevolutionarLegitimationComment> {
    const legitimation = await this.findOne(legitimationId);

    const comment = this.commentRepository.create({
      legitimationId,
      userId,
      content: dto.content,
    });

    await this.commentRepository.save(comment);

    // Notifica despre comentariu
    await this.notifyAboutComment(legitimation, userId, dto.content);

    return this.commentRepository.findOne({
      where: { id: comment.id },
      relations: ['user'],
    });
  }

  private async notifyAboutComment(legitimation: RevolutionarLegitimation, commenterUserId: string, commentContent: string): Promise<void> {
    const commenter = await this.userRepository.findOne({ where: { id: commenterUserId } });
    const commenterName = commenter?.fullName || 'Un utilizator';

    // Notifica creatorul legitimatiei (daca nu e el cel care comenteaza)
    if (legitimation.createdBy !== commenterUserId) {
      await this.notificationsService.create({
        userId: legitimation.createdBy,
        type: NotificationType.PARKING_ISSUE_RESOLVED,
        title: 'Comentariu nou la legitimatie revolutionar/deportat',
        message: `${commenterName} a adaugat un comentariu la legitimatia pentru ${legitimation.personName}.`,
        data: {
          revolutionarLegitimationId: legitimation.id,
          personName: legitimation.personName,
        },
      });
    }

    // Notifica departamentul Parcari Handicap
    const handicapDept = await this.departmentRepository.findOne({
      where: { name: HANDICAP_PARKING_DEPARTMENT_NAME },
    });
    if (handicapDept) {
      const handicapUsers = await this.userRepository.find({
        where: { departmentId: handicapDept.id, isActive: true },
      });

      const toNotify = handicapUsers.filter(u => u.id !== commenterUserId && u.id !== legitimation.createdBy);

      if (toNotify.length > 0) {
        const notifications = toNotify.map(user => ({
          userId: user.id,
          type: NotificationType.PARKING_ISSUE_RESOLVED,
          title: 'Comentariu nou la legitimatie revolutionar/deportat',
          message: `${commenterName} a adaugat un comentariu la legitimatia pentru ${legitimation.personName}.`,
          data: {
            revolutionarLegitimationId: legitimation.id,
            personName: legitimation.personName,
          },
        }));

        await this.notificationsService.createMany(notifications);
      }
    }
  }

  async getComments(legitimationId: string): Promise<RevolutionarLegitimationComment[]> {
    return this.commentRepository.find({
      where: { legitimationId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: string, user: User): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Doar administratorii pot sterge legitimatiile');
    }

    const legitimation = await this.findOne(id);

    // Inregistreaza in history inainte de stergere
    await this.recordHistory(id, 'DELETED', user.id, {
      personName: legitimation.personName,
      carPlate: legitimation.carPlate,
    });

    await this.legitimationRepository.remove(legitimation);
  }

  // Pentru rapoarte
  async findForReports(filters: {
    startDate?: Date;
    endDate?: Date;
    status?: RevolutionarLegitimationStatus;
  }): Promise<RevolutionarLegitimation[]> {
    const query = this.legitimationRepository.createQueryBuilder('legitimation')
      .leftJoinAndSelect('legitimation.creator', 'creator')
      .leftJoinAndSelect('legitimation.resolver', 'resolver');

    if (filters.startDate) {
      query.andWhere('legitimation.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('legitimation.createdAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters.status) {
      query.andWhere('legitimation.status = :status', { status: filters.status });
    }

    return query.orderBy('legitimation.createdAt', 'DESC').getMany();
  }
}
