import { Injectable, Logger, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
import { isAdminOrAbove } from '../../common/utils/role-hierarchy';
import { Department } from '../departments/entities/department.entity';
import {
  MAINTENANCE_DEPARTMENT_NAME,
  HANDICAP_PARKING_DEPARTMENT_NAME,
  DOMICILIU_PARKING_DEPARTMENT_NAME,
  DOMICILIU_REQUEST_TYPE_LABELS,
  DOMICILIU_REQUEST_PRIORITY_LABELS,
  DomiciliuRequestType,
  DomiciliuRequestStatus,
  DomiciliuRequestPriority,
  SIGN_PLACEMENT_STATUS,
  SignPlacementStatus,
} from './constants/parking.constants';
import { removeDiacritics } from '../../common/utils/remove-diacritics';

@Injectable()
export class DomiciliuRequestsService {
  private readonly logger = new Logger(DomiciliuRequestsService.name);

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
    // Verifica daca utilizatorul este de la Intretinere Parcari - nu are voie sa creeze solicitari
    const creator = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['department'],
    });
    if (creator && creator.role === UserRole.USER &&
        removeDiacritics(creator.department?.name || '') === MAINTENANCE_DEPARTMENT_NAME) {
      throw new ForbiddenException('Utilizatorii din departamentul Intretinere Parcari nu pot crea solicitari');
    }

    const request = this.domiciliuRequestRepository.create({
      requestType: dto.requestType as DomiciliuRequestType,
      priority: (dto.priority || 'MEDIU') as DomiciliuRequestPriority,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      location: removeDiacritics(dto.location),
      googleMapsLink: dto.googleMapsLink,
      description: removeDiacritics(dto.description),
      personName: dto.personName ? removeDiacritics(dto.personName) : dto.personName,
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
      signPlacementStatus: (dto.requestType === 'AMPLASARE_PANOU' || dto.requestType === 'REVOCARE_PANOU'
        ? SIGN_PLACEMENT_STATUS.REQUESTED
        : SIGN_PLACEMENT_STATUS.NONE) as SignPlacementStatus,
      signPlacementRequestedAt: (dto.requestType === 'AMPLASARE_PANOU' || dto.requestType === 'REVOCARE_PANOU') ? new Date() : null,
      signPlacementRequestedBy: (dto.requestType === 'AMPLASARE_PANOU' || dto.requestType === 'REVOCARE_PANOU') ? userId : null,
    });

    const savedRequest = await this.domiciliuRequestRepository.save(request);

    // Inregistreaza in history
    await this.recordHistory(savedRequest.id, 'CREATED', userId, {
      requestType: dto.requestType,
      location: dto.location,
      personName: dto.personName,
    });

    // Notifica echipa de Intretinere Parcari
    await this.notifyMaintenanceTeam(savedRequest, userId);

    return this.findOne(savedRequest.id);
  }

  async update(id: string, userId: string, dto: UpdateDomiciliuRequestDto, userRole: UserRole): Promise<DomiciliuRequest> {
    // Doar Admin poate modifica
    if (!isAdminOrAbove(userRole)) {
      throw new ForbiddenException('Doar administratorii pot modifica solicitarile');
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
    if (dto.priority !== undefined && dto.priority !== request.priority) {
      changes.priority = { from: request.priority, to: dto.priority };
      request.priority = dto.priority as DomiciliuRequestPriority;
    }
    if (dto.deadline !== undefined) {
      const newDeadline = dto.deadline ? new Date(dto.deadline) : null;
      const oldStr = request.deadline ? new Date(request.deadline).toISOString() : null;
      const newStr = newDeadline ? newDeadline.toISOString() : null;
      if (oldStr !== newStr) {
        changes.deadline = { from: oldStr, to: newStr };
        request.deadline = newDeadline;
        // Reset deadlineNotifiedAt cand se schimba deadline-ul, ca sa primeasca o noua avertizare
        request.deadlineNotifiedAt = null;
      }
    }

    request.lastModifiedBy = userId;

    await this.domiciliuRequestRepository.save(request);

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
      entityType: 'DOMICILIU_REQUEST',
      entityId,
      action,
      userId,
      changes,
    });
    await this.historyRepository.save(history);
  }

  private async notifyMaintenanceTeam(request: DomiciliuRequest, creatorUserId: string): Promise<void> {
    // Gaseste departamentul Intretinere Parcari
    const maintenanceDept = await this.departmentRepository.findOne({
      where: { name: MAINTENANCE_DEPARTMENT_NAME },
    });

    if (!maintenanceDept) {
      return;
    }

    // Gaseste toti userii din departamentul Intretinere Parcari
    const maintenanceUsers = await this.userRepository.find({
      where: {
        departmentId: maintenanceDept.id,
        isActive: true,
      },
    });

    if (maintenanceUsers.length === 0) {
      return;
    }

    // Obtine creatorul
    const creator = await this.userRepository.findOne({ where: { id: creatorUserId } });
    const creatorName = creator?.fullName || 'Un utilizator';

    const requestTypeLabel = DOMICILIU_REQUEST_TYPE_LABELS[request.requestType];

    // Trimite notificari in-app catre toti userii din echipa de intretinere (email-urile se trimit doar in digest-ul zilnic)
    const notifications = maintenanceUsers.map(user => ({
      userId: user.id,
      type: NotificationType.DOMICILIU_REQUEST_ASSIGNED,
      title: `Solicitare domiciliu noua: ${requestTypeLabel}`,
      message: `O noua solicitare de tip "${requestTypeLabel}" pentru ${request.personName} la ${request.location} necesita atentia ta.`,
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

    // Lista utilizatorilor care trebuie notificati
    const usersToNotify: User[] = [];

    // 1. Creatorul solicitarii
    if (request.createdBy !== resolverUserId) {
      const creator = await this.userRepository.findOne({ where: { id: request.createdBy } });
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

    // 3. Toti userii din Parcari Domiciliu
    const domiciliuDept = await this.departmentRepository.findOne({
      where: { name: DOMICILIU_PARKING_DEPARTMENT_NAME },
    });
    if (domiciliuDept) {
      const domiciliuUsers = await this.userRepository.find({
        where: { departmentId: domiciliuDept.id, isActive: true },
      });
      usersToNotify.push(...domiciliuUsers.filter(u => u.id !== resolverUserId));
    }

    // 4. Toti adminii
    const admins = await this.userRepository.find({
      where: { role: In([UserRole.ADMIN, UserRole.MASTER_ADMIN]), isActive: true },
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
      type: NotificationType.DOMICILIU_REQUEST_RESOLVED,
      title: `Solicitare domiciliu finalizata: ${requestTypeLabel}`,
      message: `Solicitarea de tip "${requestTypeLabel}" pentru ${request.personName} a fost finalizata de ${resolverName}.`,
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
      .leftJoinAndSelect('request.lastModifier', 'lastModifier')
      .leftJoinAndSelect('request.signPlacementRequester', 'signPlacementRequester')
      .leftJoinAndSelect('request.signPlacementClaimer', 'signPlacementClaimer')
      .leftJoinAndSelect('request.signPlacementCompleter', 'signPlacementCompleter');

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
      relations: ['creator', 'resolver', 'lastModifier', 'signPlacementRequester', 'signPlacementClaimer', 'signPlacementCompleter', 'comments', 'comments.user'],
    });

    if (!request) {
      throw new NotFoundException(`Solicitarea cu ID ${id} nu a fost gasita`);
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
      throw new ForbiddenException('Aceasta solicitare este deja finalizata');
    }

    request.status = 'FINALIZAT';
    request.resolutionDescription = dto.resolutionDescription;
    request.resolvedBy = userId;
    request.lastModifiedBy = userId;
    request.resolvedAt = new Date();

    await this.domiciliuRequestRepository.save(request);

    // Inregistreaza in history
    await this.recordHistory(id, 'RESOLVED', userId, {
      resolutionDescription: dto.resolutionDescription,
    });

    // Notifica toate partile implicate
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

    // Notifica despre comentariu
    await this.notifyAboutComment(request, userId, dto.content);

    const savedComment = await this.commentRepository.findOne({
      where: { id: comment.id },
      relations: ['user'],
    });
    if (!savedComment) {
      throw new InternalServerErrorException('Failed to reload comment after save');
    }
    return savedComment;
  }

  private async notifyAboutComment(request: DomiciliuRequest, commenterUserId: string, commentContent: string): Promise<void> {
    const commenter = await this.userRepository.findOne({ where: { id: commenterUserId } });
    const commenterName = commenter?.fullName || 'Un utilizator';

    const requestTypeLabel = DOMICILIU_REQUEST_TYPE_LABELS[request.requestType];

    // Notifica creatorul solicitarii (daca nu e el cel care comenteaza)
    if (request.createdBy !== commenterUserId) {
      await this.notificationsService.create({
        userId: request.createdBy,
        type: NotificationType.DOMICILIU_REQUEST_ASSIGNED,
        title: 'Comentariu nou la solicitare domiciliu',
        message: `${commenterName} a adaugat un comentariu la solicitarea ta de tip "${requestTypeLabel}".`,
        data: {
          domiciliuRequestId: request.id,
          requestType: request.requestType,
        },
      });
    }

    // Notifica echipa de intretinere
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
          type: NotificationType.DOMICILIU_REQUEST_ASSIGNED,
          title: 'Comentariu nou la solicitare domiciliu',
          message: `${commenterName} a adaugat un comentariu la solicitarea "${requestTypeLabel}" pentru ${request.personName}.`,
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
    if (!isAdminOrAbove(user.role)) {
      throw new ForbiddenException('Doar administratorii pot sterge solicitarile');
    }

    const request = await this.findOne(id);

    // Inregistreaza in history inainte de stergere
    await this.recordHistory(id, 'DELETED', user.id, {
      requestType: request.requestType,
      location: request.location,
      personName: request.personName,
    });

    await this.domiciliuRequestRepository.remove(request);
  }

  // ===== AMPLASARE PANOU =====

  async requestSignPlacement(id: string, userId: string): Promise<DomiciliuRequest> {
    const request = await this.findOne(id);

    if (request.signPlacementStatus !== SIGN_PLACEMENT_STATUS.NONE) {
      throw new ForbiddenException('Amplasarea panoului a fost deja solicitata');
    }

    request.signPlacementStatus = SIGN_PLACEMENT_STATUS.REQUESTED as SignPlacementStatus;
    request.signPlacementRequestedAt = new Date();
    request.signPlacementRequestedBy = userId;
    request.lastModifiedBy = userId;

    await this.domiciliuRequestRepository.save(request);

    await this.recordHistory(id, 'UPDATED', userId, {
      signPlacementStatus: { from: 'NONE', to: 'REQUESTED' },
    });

    await this.notifyMaintenanceSignPlacement(request, userId, 'requested');

    return this.findOne(id);
  }

  async claimSignPlacement(id: string, userId: string, user: any): Promise<DomiciliuRequest> {
    const userDeptName = removeDiacritics(user.department?.name || '');
    const isMaintenance = userDeptName === MAINTENANCE_DEPARTMENT_NAME;
    const isAdmin = isAdminOrAbove(user.role);

    if (!isMaintenance && !isAdmin) {
      throw new ForbiddenException('Doar departamentul Intretinere Parcari si administratorii pot revendica amplasarea panoului');
    }

    const request = await this.findOne(id);

    if (request.signPlacementStatus !== SIGN_PLACEMENT_STATUS.REQUESTED) {
      throw new ForbiddenException('Amplasarea panoului nu este in starea corecta pentru revendicare');
    }

    request.signPlacementStatus = SIGN_PLACEMENT_STATUS.CLAIMED as SignPlacementStatus;
    request.signPlacementClaimedBy = userId;
    request.signPlacementClaimedAt = new Date();
    request.lastModifiedBy = userId;

    await this.domiciliuRequestRepository.save(request);

    await this.recordHistory(id, 'UPDATED', userId, {
      signPlacementStatus: { from: 'REQUESTED', to: 'CLAIMED' },
    });

    await this.notifyMaintenanceSignPlacement(request, userId, 'claimed');

    return this.findOne(id);
  }

  async completeSignPlacement(id: string, userId: string, observations: string | null, user: any): Promise<DomiciliuRequest> {
    const userDeptName = removeDiacritics(user.department?.name || '');
    const isMaintenance = userDeptName === MAINTENANCE_DEPARTMENT_NAME;
    const isAdmin = isAdminOrAbove(user.role);

    if (!isMaintenance && !isAdmin) {
      throw new ForbiddenException('Doar departamentul Intretinere Parcari si administratorii pot finaliza amplasarea panoului');
    }

    const request = await this.findOne(id);

    if (request.signPlacementStatus !== SIGN_PLACEMENT_STATUS.CLAIMED) {
      throw new ForbiddenException('Amplasarea panoului nu este in starea corecta pentru finalizare');
    }

    request.signPlacementStatus = SIGN_PLACEMENT_STATUS.COMPLETED as SignPlacementStatus;
    request.signPlacementCompletedBy = userId;
    request.signPlacementCompletedAt = new Date();
    request.signPlacementObservations = observations || null;
    request.lastModifiedBy = userId;

    await this.domiciliuRequestRepository.save(request);

    await this.recordHistory(id, 'UPDATED', userId, {
      signPlacementStatus: { from: 'CLAIMED', to: 'COMPLETED' },
      signPlacementObservations: observations,
    });

    await this.notifyMaintenanceSignPlacement(request, userId, 'completed');

    return this.findOne(id);
  }

  private async notifyMaintenanceSignPlacement(
    request: DomiciliuRequest,
    actorUserId: string,
    action: 'requested' | 'claimed' | 'completed',
  ): Promise<void> {
    try {
      const actor = await this.userRepository.findOne({ where: { id: actorUserId } });
      const actorName = actor?.fullName || 'Un utilizator';
      const notifiedUserIds = new Set<string>();
      const notifications: any[] = [];

      const isRevocare = request.requestType === 'REVOCARE_PANOU' || request.requestType === 'REVOCARE_LOCURI';
      const panouLabel = isRevocare ? 'revocare panou' : 'amplasare panou';
      const panouAction = isRevocare ? 'revocarea' : 'amplasarea';

      const titles: Record<string, string> = {
        requested: `Solicitare ${panouLabel} domiciliu`,
        claimed: `${isRevocare ? 'Revocare' : 'Amplasare'} panou domiciliu - revendicata`,
        completed: `${isRevocare ? 'Revocare' : 'Amplasare'} panou domiciliu - finalizata`,
      };

      const messages: Record<string, string> = {
        requested: `${actorName} a solicitat ${panouAction} panoului pentru ${request.personName || 'N/A'} la ${request.location}.`,
        claimed: `${actorName} a revendicat ${panouAction} panoului pentru ${request.personName || 'N/A'} la ${request.location}.`,
        completed: `${actorName} a finalizat ${panouAction} panoului pentru ${request.personName || 'N/A'} la ${request.location}.`,
      };

      // Notifica Intretinere Parcari
      const maintenanceDept = await this.departmentRepository.findOne({
        where: { name: MAINTENANCE_DEPARTMENT_NAME },
      });
      if (maintenanceDept) {
        const maintenanceUsers = await this.userRepository.find({
          where: { departmentId: maintenanceDept.id, isActive: true },
        });
        maintenanceUsers.forEach(u => {
          if (u.id !== actorUserId && !notifiedUserIds.has(u.id)) {
            notifiedUserIds.add(u.id);
            notifications.push({
              userId: u.id,
              type: NotificationType.DOMICILIU_SIGN_PLACEMENT,
              title: titles[action],
              message: messages[action],
              data: { domiciliuRequestId: request.id },
            });
          }
        });
      }

      // Notifica Parcari Domiciliu
      const domiciliuDept = await this.departmentRepository.findOne({
        where: { name: DOMICILIU_PARKING_DEPARTMENT_NAME },
      });
      if (domiciliuDept) {
        const domiciliuUsers = await this.userRepository.find({
          where: { departmentId: domiciliuDept.id, isActive: true },
        });
        domiciliuUsers.forEach(u => {
          if (u.id !== actorUserId && !notifiedUserIds.has(u.id)) {
            notifiedUserIds.add(u.id);
            notifications.push({
              userId: u.id,
              type: NotificationType.DOMICILIU_SIGN_PLACEMENT,
              title: titles[action],
              message: messages[action],
              data: { domiciliuRequestId: request.id },
            });
          }
        });
      }

      // Notifica Admin
      const admins = await this.userRepository.find({
        where: { role: In([UserRole.ADMIN, UserRole.MASTER_ADMIN]), isActive: true },
      });
      admins.forEach(u => {
        if (u.id !== actorUserId && !notifiedUserIds.has(u.id)) {
          notifiedUserIds.add(u.id);
          notifications.push({
            userId: u.id,
            type: NotificationType.DOMICILIU_SIGN_PLACEMENT,
            title: titles[action],
            message: messages[action],
            data: { domiciliuRequestId: request.id },
          });
        }
      });

      // Notifica creatorul cererii
      if (request.createdBy !== actorUserId && !notifiedUserIds.has(request.createdBy)) {
        notifications.push({
          userId: request.createdBy,
          type: NotificationType.DOMICILIU_SIGN_PLACEMENT,
          title: titles[action],
          message: messages[action],
          data: { domiciliuRequestId: request.id },
        });
      }

      if (notifications.length > 0) {
        await this.notificationsService.createMany(notifications);
      }
    } catch (error) {
      this.logger.error(`Error notifying sign placement: ${error.message}`);
    }
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
