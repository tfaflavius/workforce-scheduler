import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomiciliuRequest } from './entities/domiciliu-request.entity';
import { DomiciliuRequestComment } from './entities/domiciliu-request-comment.entity';
import { ParkingHistory } from './entities/parking-history.entity';
import { CreateDomiciliuRequestDto } from './dto/create-domiciliu-request.dto';
import { UpdateDomiciliuRequestDto } from './dto/update-domiciliu-request.dto';
import { ResolveDomiciliuRequestDto } from './dto/resolve-domiciliu-request.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import {
  MAINTENANCE_DEPARTMENT_NAME,
  HANDICAP_PARKING_DEPARTMENT_NAME,
  DOMICILIU_PARKING_DEPARTMENT_NAME,
  DOMICILIU_REQUEST_TYPE_LABELS,
  DomiciliuRequestType,
  DomiciliuRequestStatus,
} from './constants/parking.constants';

@Injectable()
export class DomiciliuRequestsService {
  constructor(
    @InjectRepository(DomiciliuRequest)
    private readonly domiciliuRequestRepository: Repository<DomiciliuRequest>,
    @InjectRepository(DomiciliuRequestComment)
    private readonly commentRepository: Repository<DomiciliuRequestComment>,
    @InjectRepository(ParkingHistory)
    private readonly historyRepository: Repository<ParkingHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateDomiciliuRequestDto): Promise<DomiciliuRequest> {
    const request = this.domiciliuRequestRepository.create({
      requestType: dto.requestType as DomiciliuRequestType,
      location: dto.location,
      googleMapsLink: dto.googleMapsLink,
      description: dto.description,
      personName: dto.personName,
      cnp: dto.cnp,
      address: dto.address,
      carPlate: dto.carPlate,
      carBrand: dto.carBrand,
      phone: dto.phone,
      email: dto.email,
      contractNumber: dto.contractNumber,
      createdBy: userId,
      lastModifiedBy: userId,
      status: 'ACTIVE' as DomiciliuRequestStatus,
    });

    const savedRequest = await this.domiciliuRequestRepository.save(request);

    // Înregistrează în history
    await this.recordHistory(savedRequest.id, 'CREATED', userId, {
      requestType: dto.requestType,
      location: dto.location,
      personName: dto.personName,
    });

    // Notifică echipa de Întreținere Parcări
    await this.notifyMaintenanceTeam(savedRequest, userId);

    return this.findOne(savedRequest.id);
  }

  async update(id: string, userId: string, dto: UpdateDomiciliuRequestDto, userRole: UserRole): Promise<DomiciliuRequest> {
    // Doar Admin poate modifica
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Doar administratorii pot modifica solicitările');
    }

    const request = await this.findOne(id);

    const changes: Record<string, any> = {};

    if (dto.location && dto.location !== request.location) {
      changes.location = { from: request.location, to: dto.location };
      request.location = dto.location;
    }
    if (dto.description && dto.description !== request.description) {
      changes.description = { from: request.description, to: dto.description };
      request.description = dto.description;
    }
    if (dto.googleMapsLink !== undefined && dto.googleMapsLink !== request.googleMapsLink) {
      changes.googleMapsLink = { from: request.googleMapsLink, to: dto.googleMapsLink };
      request.googleMapsLink = dto.googleMapsLink;
    }
    if (dto.personName !== undefined && dto.personName !== request.personName) {
      changes.personName = { from: request.personName, to: dto.personName };
      request.personName = dto.personName;
    }
    if (dto.cnp !== undefined && dto.cnp !== request.cnp) {
      changes.cnp = { from: request.cnp, to: dto.cnp };
      request.cnp = dto.cnp;
    }
    if (dto.address !== undefined && dto.address !== request.address) {
      changes.address = { from: request.address, to: dto.address };
      request.address = dto.address;
    }
    if (dto.carPlate !== undefined && dto.carPlate !== request.carPlate) {
      changes.carPlate = { from: request.carPlate, to: dto.carPlate };
      request.carPlate = dto.carPlate;
    }
    if (dto.carBrand !== undefined && dto.carBrand !== request.carBrand) {
      changes.carBrand = { from: request.carBrand, to: dto.carBrand };
      request.carBrand = dto.carBrand;
    }
    if (dto.phone !== undefined && dto.phone !== request.phone) {
      changes.phone = { from: request.phone, to: dto.phone };
      request.phone = dto.phone;
    }
    if (dto.email !== undefined && dto.email !== request.email) {
      changes.email = { from: request.email, to: dto.email };
      request.email = dto.email;
    }
    if (dto.contractNumber !== undefined && dto.contractNumber !== request.contractNumber) {
      changes.contractNumber = { from: request.contractNumber, to: dto.contractNumber };
      request.contractNumber = dto.contractNumber;
    }

    request.lastModifiedBy = userId;

    await this.domiciliuRequestRepository.save(request);

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
      entityType: 'DOMICILIU_REQUEST',
      entityId,
      action,
      userId,
      changes,
    });
    await this.historyRepository.save(history);
  }

  private async notifyMaintenanceTeam(request: DomiciliuRequest, creatorUserId: string): Promise<void> {
    // Găsește departamentul Întreținere Parcări
    const maintenanceDept = await this.departmentRepository.findOne({
      where: { name: MAINTENANCE_DEPARTMENT_NAME },
    });

    if (!maintenanceDept) {
      return;
    }

    // Găsește toți userii din departamentul Întreținere Parcări
    const maintenanceUsers = await this.userRepository.find({
      where: {
        departmentId: maintenanceDept.id,
        isActive: true,
      },
    });

    if (maintenanceUsers.length === 0) {
      return;
    }

    // Obține creatorul
    const creator = await this.userRepository.findOne({ where: { id: creatorUserId } });
    const creatorName = creator?.fullName || 'Un utilizator';

    const requestTypeLabel = DOMICILIU_REQUEST_TYPE_LABELS[request.requestType];

    // Trimite notificări in-app către toți userii din echipa de întreținere (email-urile se trimit doar în digest-ul zilnic)
    const notifications = maintenanceUsers.map(user => ({
      userId: user.id,
      type: NotificationType.PARKING_ISSUE_ASSIGNED,
      title: `Solicitare domiciliu nouă: ${requestTypeLabel}`,
      message: `O nouă solicitare de tip "${requestTypeLabel}" pentru ${request.personName} la ${request.location} necesită atenția ta.`,
      data: {
        domiciliuRequestId: request.id,
        requestType: request.requestType,
        location: request.location,
      },
    }));

    await this.notificationsService.createMany(notifications);
  }

  private async notifyOnResolution(request: DomiciliuRequest, resolverUserId: string): Promise<void> {
    const resolver = await this.userRepository.findOne({ where: { id: resolverUserId } });
    const resolverName = resolver?.fullName || 'Un utilizator';

    const requestTypeLabel = DOMICILIU_REQUEST_TYPE_LABELS[request.requestType];

    // Lista utilizatorilor care trebuie notificați
    const usersToNotify: User[] = [];

    // 1. Creatorul solicitării
    if (request.createdBy !== resolverUserId) {
      const creator = await this.userRepository.findOne({ where: { id: request.createdBy } });
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

    // 3. Toți userii din Parcări Domiciliu
    const domiciliuDept = await this.departmentRepository.findOne({
      where: { name: DOMICILIU_PARKING_DEPARTMENT_NAME },
    });
    if (domiciliuDept) {
      const domiciliuUsers = await this.userRepository.find({
        where: { departmentId: domiciliuDept.id, isActive: true },
      });
      usersToNotify.push(...domiciliuUsers.filter(u => u.id !== resolverUserId));
    }

    // 4. Toți adminii
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

    // Trimite notificări in-app (email-urile se trimit doar în digest-ul zilnic)
    const notifications = uniqueUsers.map(user => ({
      userId: user.id,
      type: NotificationType.PARKING_ISSUE_RESOLVED,
      title: `Solicitare domiciliu finalizată: ${requestTypeLabel}`,
      message: `Solicitarea de tip "${requestTypeLabel}" pentru ${request.personName} a fost finalizată de ${resolverName}.`,
      data: {
        domiciliuRequestId: request.id,
        requestType: request.requestType,
        location: request.location,
        resolutionDescription: request.resolutionDescription,
      },
    }));

    await this.notificationsService.createMany(notifications);
  }

  async findAll(status?: DomiciliuRequestStatus, requestType?: DomiciliuRequestType): Promise<DomiciliuRequest[]> {
    const query = this.domiciliuRequestRepository.createQueryBuilder('request')
      .leftJoinAndSelect('request.creator', 'creator')
      .leftJoinAndSelect('request.resolver', 'resolver')
      .leftJoinAndSelect('request.lastModifier', 'lastModifier');

    if (status) {
      query.andWhere('request.status = :status', { status });
    }

    if (requestType) {
      query.andWhere('request.requestType = :requestType', { requestType });
    }

    return query.orderBy('request.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<DomiciliuRequest> {
    const request = await this.domiciliuRequestRepository.findOne({
      where: { id },
      relations: ['creator', 'resolver', 'lastModifier', 'comments', 'comments.user'],
    });

    if (!request) {
      throw new NotFoundException(`Solicitarea cu ID ${id} nu a fost găsită`);
    }

    return request;
  }

  async getHistory(id: string): Promise<ParkingHistory[]> {
    return this.historyRepository.find({
      where: { entityType: 'DOMICILIU_REQUEST', entityId: id },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async resolve(id: string, userId: string, dto: ResolveDomiciliuRequestDto): Promise<DomiciliuRequest> {
    const request = await this.findOne(id);

    if (request.status === 'FINALIZAT') {
      throw new ForbiddenException('Această solicitare este deja finalizată');
    }

    request.status = 'FINALIZAT';
    request.resolutionDescription = dto.resolutionDescription;
    request.resolvedBy = userId;
    request.lastModifiedBy = userId;
    request.resolvedAt = new Date();

    await this.domiciliuRequestRepository.save(request);

    // Înregistrează în history
    await this.recordHistory(id, 'RESOLVED', userId, {
      resolutionDescription: dto.resolutionDescription,
    });

    // Notifică toate părțile implicate
    await this.notifyOnResolution(request, userId);

    return this.findOne(id);
  }

  async addComment(requestId: string, userId: string, dto: CreateCommentDto): Promise<DomiciliuRequestComment> {
    const request = await this.findOne(requestId);

    const comment = this.commentRepository.create({
      requestId,
      userId,
      content: dto.content,
    });

    await this.commentRepository.save(comment);

    // Notifică despre comentariu
    await this.notifyAboutComment(request, userId, dto.content);

    return this.commentRepository.findOne({
      where: { id: comment.id },
      relations: ['user'],
    });
  }

  private async notifyAboutComment(request: DomiciliuRequest, commenterUserId: string, commentContent: string): Promise<void> {
    const commenter = await this.userRepository.findOne({ where: { id: commenterUserId } });
    const commenterName = commenter?.fullName || 'Un utilizator';

    const requestTypeLabel = DOMICILIU_REQUEST_TYPE_LABELS[request.requestType];

    // Notifică creatorul solicitării (dacă nu e el cel care comentează)
    if (request.createdBy !== commenterUserId) {
      await this.notificationsService.create({
        userId: request.createdBy,
        type: NotificationType.PARKING_ISSUE_RESOLVED,
        title: 'Comentariu nou la solicitare domiciliu',
        message: `${commenterName} a adăugat un comentariu la solicitarea ta de tip "${requestTypeLabel}".`,
        data: {
          domiciliuRequestId: request.id,
          requestType: request.requestType,
        },
      });
    }

    // Notifică echipa de întreținere
    const maintenanceDept = await this.departmentRepository.findOne({
      where: { name: MAINTENANCE_DEPARTMENT_NAME },
    });
    if (maintenanceDept) {
      const maintenanceUsers = await this.userRepository.find({
        where: { departmentId: maintenanceDept.id, isActive: true },
      });

      const toNotify = maintenanceUsers.filter(u => u.id !== commenterUserId);

      if (toNotify.length > 0) {
        const notifications = toNotify.map(user => ({
          userId: user.id,
          type: NotificationType.PARKING_ISSUE_RESOLVED,
          title: 'Comentariu nou la solicitare domiciliu',
          message: `${commenterName} a adăugat un comentariu la solicitarea "${requestTypeLabel}" pentru ${request.personName}.`,
          data: {
            domiciliuRequestId: request.id,
            requestType: request.requestType,
          },
        }));

        await this.notificationsService.createMany(notifications);
      }
    }
  }

  async getComments(requestId: string): Promise<DomiciliuRequestComment[]> {
    return this.commentRepository.find({
      where: { requestId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: string, user: User): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Doar administratorii pot șterge solicitările');
    }

    const request = await this.findOne(id);

    // Înregistrează în history înainte de ștergere
    await this.recordHistory(id, 'DELETED', user.id, {
      requestType: request.requestType,
      location: request.location,
      personName: request.personName,
    });

    await this.domiciliuRequestRepository.remove(request);
  }

  // Pentru rapoarte
  async findForReports(filters: {
    startDate?: Date;
    endDate?: Date;
    status?: DomiciliuRequestStatus;
    requestType?: DomiciliuRequestType;
  }): Promise<DomiciliuRequest[]> {
    const query = this.domiciliuRequestRepository.createQueryBuilder('request')
      .leftJoinAndSelect('request.creator', 'creator')
      .leftJoinAndSelect('request.resolver', 'resolver');

    if (filters.startDate) {
      query.andWhere('request.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('request.createdAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters.status) {
      query.andWhere('request.status = :status', { status: filters.status });
    }

    if (filters.requestType) {
      query.andWhere('request.requestType = :requestType', { requestType: filters.requestType });
    }

    return query.orderBy('request.createdAt', 'DESC').getMany();
  }
}
