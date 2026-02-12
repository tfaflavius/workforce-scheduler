import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HandicapLegitimation } from './entities/handicap-legitimation.entity';
import { HandicapLegitimationComment } from './entities/handicap-legitimation-comment.entity';
import { ParkingHistory } from './entities/parking-history.entity';
import { CreateHandicapLegitimationDto } from './dto/create-handicap-legitimation.dto';
import { UpdateHandicapLegitimationDto } from './dto/update-handicap-legitimation.dto';
import { ResolveHandicapLegitimationDto } from './dto/resolve-handicap-legitimation.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import {
  HANDICAP_PARKING_DEPARTMENT_NAME,
  HandicapLegitimationStatus,
} from './constants/parking.constants';
import { EmailService } from '../../common/email/email.service';

@Injectable()
export class HandicapLegitimationsService {
  constructor(
    @InjectRepository(HandicapLegitimation)
    private readonly legitimationRepository: Repository<HandicapLegitimation>,
    @InjectRepository(HandicapLegitimationComment)
    private readonly commentRepository: Repository<HandicapLegitimationComment>,
    @InjectRepository(ParkingHistory)
    private readonly historyRepository: Repository<ParkingHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, dto: CreateHandicapLegitimationDto): Promise<HandicapLegitimation> {
    const legitimation = this.legitimationRepository.create({
      personName: dto.personName,
      cnp: dto.cnp,
      handicapCertificateNumber: dto.handicapCertificateNumber,
      carPlate: dto.carPlate,
      autoNumber: dto.autoNumber,
      phone: dto.phone,
      description: dto.description,
      createdBy: userId,
      lastModifiedBy: userId,
      status: 'ACTIVE' as HandicapLegitimationStatus,
    });

    const savedLegitimation = await this.legitimationRepository.save(legitimation);

    // Înregistrează în history
    await this.recordHistory(savedLegitimation.id, 'CREATED', userId, {
      personName: dto.personName,
      carPlate: dto.carPlate,
    });

    // Notifică departamentul Parcări Handicap
    await this.notifyHandicapDepartment(savedLegitimation, userId);

    return this.findOne(savedLegitimation.id);
  }

  async update(id: string, userId: string, dto: UpdateHandicapLegitimationDto, user: any): Promise<HandicapLegitimation> {
    // Admin și userii de la departamentul Parcări Handicap pot edita
    const canEdit = user.role === UserRole.ADMIN ||
      user.department?.name === HANDICAP_PARKING_DEPARTMENT_NAME;

    if (!canEdit) {
      throw new ForbiddenException('Doar administratorii și departamentul Parcări Handicap pot modifica legitimațiile');
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
    if (dto.handicapCertificateNumber && dto.handicapCertificateNumber !== legitimation.handicapCertificateNumber) {
      changes.handicapCertificateNumber = { from: legitimation.handicapCertificateNumber, to: dto.handicapCertificateNumber };
      legitimation.handicapCertificateNumber = dto.handicapCertificateNumber;
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

    // Înregistrează în history
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
      entityType: 'HANDICAP_LEGITIMATION',
      entityId,
      action,
      userId,
      changes,
    });
    await this.historyRepository.save(history);
  }

  private async notifyHandicapDepartment(legitimation: HandicapLegitimation, creatorUserId: string): Promise<void> {
    // Găsește departamentul Parcări Handicap
    const handicapDept = await this.departmentRepository.findOne({
      where: { name: HANDICAP_PARKING_DEPARTMENT_NAME },
    });

    if (!handicapDept) {
      return;
    }

    // Găsește toți userii din departamentul Parcări Handicap
    const handicapUsers = await this.userRepository.find({
      where: {
        departmentId: handicapDept.id,
        isActive: true,
      },
    });

    // Adaugă și adminii
    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
    });

    const allUsers = [...handicapUsers, ...admins].filter(
      (user, index, self) => index === self.findIndex(u => u.id === user.id) && user.id !== creatorUserId
    );

    if (allUsers.length === 0) {
      return;
    }

    // Obține creatorul
    const creator = await this.userRepository.findOne({ where: { id: creatorUserId } });
    const creatorName = creator?.fullName || 'Un utilizator';

    // Trimite notificări in-app
    const notifications = allUsers.map(user => ({
      userId: user.id,
      type: NotificationType.PARKING_ISSUE_ASSIGNED,
      title: 'Solicitare legitimație handicap nouă',
      message: `O nouă solicitare de legitimație pentru ${legitimation.personName} (${legitimation.carPlate}) a fost creată de ${creatorName}.`,
      data: {
        handicapLegitimationId: legitimation.id,
        personName: legitimation.personName,
        carPlate: legitimation.carPlate,
      },
    }));

    await this.notificationsService.createMany(notifications);

    // Trimite email-uri
    for (const user of allUsers) {
      await this.emailService.sendHandicapLegitimationNotification({
        recipientEmail: user.email,
        recipientName: user.fullName,
        personName: legitimation.personName,
        carPlate: legitimation.carPlate,
        handicapCertificateNumber: legitimation.handicapCertificateNumber,
        description: legitimation.description || '',
        creatorName: creatorName,
        emailType: 'new_request',
      });
    }
  }

  private async notifyOnResolution(legitimation: HandicapLegitimation, resolverUserId: string): Promise<void> {
    const resolver = await this.userRepository.findOne({ where: { id: resolverUserId } });
    const resolverName = resolver?.fullName || 'Un utilizator';

    // Lista utilizatorilor care trebuie notificați
    const usersToNotify: User[] = [];

    // 1. Creatorul legitimației
    if (legitimation.createdBy !== resolverUserId) {
      const creator = await this.userRepository.findOne({ where: { id: legitimation.createdBy } });
      if (creator) {
        usersToNotify.push(creator);
      }
    }

    // 2. Toți userii din Parcări Handicap
    const handicapDept = await this.departmentRepository.findOne({
      where: { name: HANDICAP_PARKING_DEPARTMENT_NAME },
    });
    if (handicapDept) {
      const handicapUsers = await this.userRepository.find({
        where: { departmentId: handicapDept.id, isActive: true },
      });
      usersToNotify.push(...handicapUsers.filter(u => u.id !== resolverUserId));
    }

    // 3. Toți adminii
    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
    });
    usersToNotify.push(...admins.filter(u => u.id !== resolverUserId));

    // Elimină duplicatele
    const uniqueUsers = usersToNotify.filter((user, index, self) =>
      index === self.findIndex(u => u.id === user.id)
    );

    if (uniqueUsers.length === 0) {
      return;
    }

    // Trimite notificări in-app
    const notifications = uniqueUsers.map(user => ({
      userId: user.id,
      type: NotificationType.PARKING_ISSUE_RESOLVED,
      title: 'Legitimație handicap finalizată',
      message: `Legitimația pentru ${legitimation.personName} a fost finalizată de ${resolverName}.`,
      data: {
        handicapLegitimationId: legitimation.id,
        personName: legitimation.personName,
        resolutionDescription: legitimation.resolutionDescription,
      },
    }));

    await this.notificationsService.createMany(notifications);

    // Trimite email-uri
    for (const user of uniqueUsers) {
      await this.emailService.sendHandicapLegitimationNotification({
        recipientEmail: user.email,
        recipientName: user.fullName,
        personName: legitimation.personName,
        carPlate: legitimation.carPlate,
        handicapCertificateNumber: legitimation.handicapCertificateNumber,
        description: legitimation.description || '',
        creatorName: resolverName,
        emailType: 'request_resolved',
        resolutionDescription: legitimation.resolutionDescription,
      });
    }
  }

  async findAll(status?: HandicapLegitimationStatus): Promise<HandicapLegitimation[]> {
    const query = this.legitimationRepository.createQueryBuilder('legitimation')
      .leftJoinAndSelect('legitimation.creator', 'creator')
      .leftJoinAndSelect('legitimation.resolver', 'resolver')
      .leftJoinAndSelect('legitimation.lastModifier', 'lastModifier');

    if (status) {
      query.andWhere('legitimation.status = :status', { status });
    }

    return query.orderBy('legitimation.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<HandicapLegitimation> {
    const legitimation = await this.legitimationRepository.findOne({
      where: { id },
      relations: ['creator', 'resolver', 'lastModifier', 'comments', 'comments.user'],
    });

    if (!legitimation) {
      throw new NotFoundException(`Legitimația cu ID ${id} nu a fost găsită`);
    }

    return legitimation;
  }

  async getHistory(id: string): Promise<ParkingHistory[]> {
    return this.historyRepository.find({
      where: { entityType: 'HANDICAP_LEGITIMATION', entityId: id },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async resolve(id: string, userId: string, dto: ResolveHandicapLegitimationDto): Promise<HandicapLegitimation> {
    const legitimation = await this.findOne(id);

    if (legitimation.status === 'FINALIZAT') {
      throw new ForbiddenException('Această legitimație este deja finalizată');
    }

    legitimation.status = 'FINALIZAT';
    legitimation.resolutionDescription = dto.resolutionDescription;
    legitimation.resolvedBy = userId;
    legitimation.lastModifiedBy = userId;
    legitimation.resolvedAt = new Date();

    await this.legitimationRepository.save(legitimation);

    // Înregistrează în history
    await this.recordHistory(id, 'RESOLVED', userId, {
      resolutionDescription: dto.resolutionDescription,
    });

    // Notifică toate părțile implicate
    await this.notifyOnResolution(legitimation, userId);

    return this.findOne(id);
  }

  async addComment(legitimationId: string, userId: string, dto: CreateCommentDto): Promise<HandicapLegitimationComment> {
    const legitimation = await this.findOne(legitimationId);

    const comment = this.commentRepository.create({
      legitimationId,
      userId,
      content: dto.content,
    });

    await this.commentRepository.save(comment);

    // Notifică despre comentariu
    await this.notifyAboutComment(legitimation, userId, dto.content);

    return this.commentRepository.findOne({
      where: { id: comment.id },
      relations: ['user'],
    });
  }

  private async notifyAboutComment(legitimation: HandicapLegitimation, commenterUserId: string, commentContent: string): Promise<void> {
    const commenter = await this.userRepository.findOne({ where: { id: commenterUserId } });
    const commenterName = commenter?.fullName || 'Un utilizator';

    // Notifică creatorul legitimației (dacă nu e el cel care comentează)
    if (legitimation.createdBy !== commenterUserId) {
      await this.notificationsService.create({
        userId: legitimation.createdBy,
        type: NotificationType.PARKING_ISSUE_RESOLVED,
        title: 'Comentariu nou la legitimație handicap',
        message: `${commenterName} a adăugat un comentariu la legitimația pentru ${legitimation.personName}.`,
        data: {
          handicapLegitimationId: legitimation.id,
          personName: legitimation.personName,
        },
      });
    }

    // Notifică departamentul Parcări Handicap
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
          title: 'Comentariu nou la legitimație handicap',
          message: `${commenterName} a adăugat un comentariu la legitimația pentru ${legitimation.personName}.`,
          data: {
            handicapLegitimationId: legitimation.id,
            personName: legitimation.personName,
          },
        }));

        await this.notificationsService.createMany(notifications);
      }
    }
  }

  async getComments(legitimationId: string): Promise<HandicapLegitimationComment[]> {
    return this.commentRepository.find({
      where: { legitimationId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: string, user: User): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Doar administratorii pot șterge legitimațiile');
    }

    const legitimation = await this.findOne(id);

    // Înregistrează în history înainte de ștergere
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
    status?: HandicapLegitimationStatus;
  }): Promise<HandicapLegitimation[]> {
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
