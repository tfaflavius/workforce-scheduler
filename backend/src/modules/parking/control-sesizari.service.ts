import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ControlSesizare } from './entities/control-sesizare.entity';
import { ControlSesizareComment } from './entities/control-sesizare-comment.entity';
import { ParkingHistory } from './entities/parking-history.entity';
import { CreateControlSesizareDto } from './dto/create-control-sesizare.dto';
import { UpdateControlSesizareDto } from './dto/update-control-sesizare.dto';
import { ResolveControlSesizareDto } from './dto/resolve-control-sesizare.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import {
  CONTROL_DEPARTMENT_NAME,
  MAINTENANCE_DEPARTMENT_NAME,
  CONTROL_SESIZARE_TYPE_LABELS,
  CONTROL_SESIZARE_ZONE_LABELS,
  ControlSesizareType,
  ControlSesizareStatus,
  ControlSesizareZone,
} from './constants/parking.constants';
import { removeDiacritics } from '../../common/utils/remove-diacritics';

@Injectable()
export class ControlSesizariService {
  constructor(
    @InjectRepository(ControlSesizare)
    private readonly sesizareRepository: Repository<ControlSesizare>,
    @InjectRepository(ControlSesizareComment)
    private readonly commentRepository: Repository<ControlSesizareComment>,
    @InjectRepository(ParkingHistory)
    private readonly historyRepository: Repository<ParkingHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateControlSesizareDto): Promise<ControlSesizare> {
    // Verifica daca utilizatorul este de la Intretinere Parcari - nu are voie sa creeze sesizari
    const creator = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['department'],
    });
    if (creator && creator.role === UserRole.USER &&
        removeDiacritics(creator.department?.name || '') === MAINTENANCE_DEPARTMENT_NAME) {
      throw new ForbiddenException('Utilizatorii din departamentul Intretinere Parcari nu pot crea sesizari');
    }

    const sesizare = this.sesizareRepository.create({
      type: dto.type as ControlSesizareType,
      zone: dto.zone as ControlSesizareZone,
      orientation: dto.type === 'MARCAJ' ? dto.orientation : null,
      location: removeDiacritics(dto.location),
      googleMapsLink: dto.googleMapsLink,
      description: removeDiacritics(dto.description),
      createdBy: userId,
      lastModifiedBy: userId,
      status: 'ACTIVE' as ControlSesizareStatus,
    });

    const savedSesizare = await this.sesizareRepository.save(sesizare);

    // Inregistreaza in history
    await this.recordHistory(savedSesizare.id, 'CREATED', userId, {
      type: dto.type,
      zone: dto.zone,
      orientation: dto.orientation,
      location: dto.location,
    });

    // Notifica echipa de Intretinere Parcari
    await this.notifyMaintenanceTeam(savedSesizare, userId);

    return this.findOne(savedSesizare.id);
  }

  async findAll(status?: ControlSesizareStatus, type?: ControlSesizareType): Promise<ControlSesizare[]> {
    const query = this.sesizareRepository.createQueryBuilder('sesizare')
      .leftJoinAndSelect('sesizare.creator', 'creator')
      .leftJoinAndSelect('sesizare.resolver', 'resolver')
      .leftJoinAndSelect('sesizare.lastModifier', 'lastModifier')
      .leftJoinAndSelect('sesizare.comments', 'comments');

    if (status) {
      query.andWhere('sesizare.status = :status', { status });
    }

    if (type) {
      query.andWhere('sesizare.type = :type', { type });
    }

    return query.orderBy('sesizare.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<ControlSesizare> {
    const sesizare = await this.sesizareRepository.findOne({
      where: { id },
      relations: ['creator', 'resolver', 'lastModifier', 'comments', 'comments.user'],
    });

    if (!sesizare) {
      throw new NotFoundException(`Sesizarea cu ID ${id} nu a fost gasita`);
    }

    return sesizare;
  }

  async update(id: string, userId: string, dto: UpdateControlSesizareDto, user: any): Promise<ControlSesizare> {
    // Doar Admin poate edita sesizari
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Doar administratorii pot modifica sesizarile');
    }

    const sesizare = await this.findOne(id);

    const changes: Record<string, any> = {};

    if (dto.zone && dto.zone !== sesizare.zone) {
      changes.zone = { from: sesizare.zone, to: dto.zone };
      sesizare.zone = dto.zone;
    }
    if (dto.orientation !== undefined && dto.orientation !== sesizare.orientation) {
      changes.orientation = { from: sesizare.orientation, to: dto.orientation };
      sesizare.orientation = dto.orientation;
    }
    if (dto.location && dto.location !== sesizare.location) {
      changes.location = { from: sesizare.location, to: dto.location };
      sesizare.location = removeDiacritics(dto.location);
    }
    if (dto.googleMapsLink !== undefined && dto.googleMapsLink !== sesizare.googleMapsLink) {
      changes.googleMapsLink = { from: sesizare.googleMapsLink, to: dto.googleMapsLink };
      sesizare.googleMapsLink = dto.googleMapsLink;
    }
    if (dto.description && dto.description !== sesizare.description) {
      changes.description = { from: sesizare.description, to: dto.description };
      sesizare.description = removeDiacritics(dto.description);
    }

    sesizare.lastModifiedBy = userId;

    await this.sesizareRepository.save(sesizare);

    // Inregistreaza in history
    if (Object.keys(changes).length > 0) {
      await this.recordHistory(id, 'UPDATED', userId, changes);
    }

    return this.findOne(id);
  }

  async resolve(id: string, userId: string, dto: ResolveControlSesizareDto): Promise<ControlSesizare> {
    const sesizare = await this.findOne(id);

    if (sesizare.status === 'FINALIZAT') {
      throw new ForbiddenException('Aceasta sesizare este deja finalizata');
    }

    sesizare.status = 'FINALIZAT';
    sesizare.resolutionDescription = dto.resolutionDescription;
    sesizare.resolvedBy = userId;
    sesizare.lastModifiedBy = userId;
    sesizare.resolvedAt = new Date();

    await this.sesizareRepository.save(sesizare);

    // Inregistreaza in history
    await this.recordHistory(id, 'RESOLVED', userId, {
      resolutionDescription: dto.resolutionDescription,
    });

    // Notifica toate partile implicate
    await this.notifyOnResolution(sesizare, userId);

    return this.findOne(id);
  }

  async addComment(sesizareId: string, userId: string, dto: CreateCommentDto): Promise<ControlSesizareComment> {
    const sesizare = await this.findOne(sesizareId);

    const comment = this.commentRepository.create({
      sesizareId,
      userId,
      content: dto.content,
    });

    await this.commentRepository.save(comment);

    // Notifica despre comentariu
    await this.notifyAboutComment(sesizare, userId, dto.content);

    return this.commentRepository.findOne({
      where: { id: comment.id },
      relations: ['user'],
    });
  }

  async getComments(sesizareId: string): Promise<ControlSesizareComment[]> {
    return this.commentRepository.find({
      where: { sesizareId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getHistory(id: string): Promise<ParkingHistory[]> {
    return this.historyRepository.find({
      where: { entityType: 'CONTROL_SESIZARE', entityId: id },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: string, user: User): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Doar administratorii pot sterge sesizarile');
    }

    const sesizare = await this.findOne(id);

    // Inregistreaza in history inainte de stergere
    await this.recordHistory(id, 'DELETED', user.id, {
      type: sesizare.type,
      zone: sesizare.zone,
      location: sesizare.location,
    });

    await this.sesizareRepository.remove(sesizare);
  }

  // Pentru rapoarte
  async findForReports(filters: {
    startDate?: Date;
    endDate?: Date;
    status?: ControlSesizareStatus;
    type?: ControlSesizareType;
  }): Promise<ControlSesizare[]> {
    const query = this.sesizareRepository.createQueryBuilder('sesizare')
      .leftJoinAndSelect('sesizare.creator', 'creator')
      .leftJoinAndSelect('sesizare.resolver', 'resolver');

    if (filters.startDate) {
      query.andWhere('sesizare.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('sesizare.createdAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters.status) {
      query.andWhere('sesizare.status = :status', { status: filters.status });
    }

    if (filters.type) {
      query.andWhere('sesizare.type = :type', { type: filters.type });
    }

    return query.orderBy('sesizare.createdAt', 'DESC').getMany();
  }

  // Metode helper pentru contorizare (folosite de scheduler)
  async countByStatus(status: ControlSesizareStatus): Promise<number> {
    return this.sesizareRepository.count({ where: { status } });
  }

  async countByStatusAndType(status: ControlSesizareStatus, type: ControlSesizareType): Promise<number> {
    return this.sesizareRepository.count({ where: { status, type } });
  }

  // ============== PRIVATE METHODS ==============

  private async recordHistory(
    entityId: string,
    action: 'CREATED' | 'UPDATED' | 'RESOLVED' | 'DELETED',
    userId: string,
    changes?: Record<string, any>,
  ): Promise<void> {
    const history = this.historyRepository.create({
      entityType: 'CONTROL_SESIZARE',
      entityId,
      action,
      userId,
      changes,
    });
    await this.historyRepository.save(history);
  }

  private async notifyMaintenanceTeam(sesizare: ControlSesizare, creatorUserId: string): Promise<void> {
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

    const typeLabel = CONTROL_SESIZARE_TYPE_LABELS[sesizare.type];
    const zoneLabel = CONTROL_SESIZARE_ZONE_LABELS[sesizare.zone];

    // Trimite notificari in-app
    const notifications = maintenanceUsers.map(user => ({
      userId: user.id,
      type: NotificationType.CONTROL_SESIZARE_ASSIGNED,
      title: `Sesizare noua: ${typeLabel}`,
      message: `${creatorName} a creat o sesizare de tip "${typeLabel}" in zona ${zoneLabel} la locatia ${sesizare.location}.`,
      data: {
        controlSesizareId: sesizare.id,
        type: sesizare.type,
        zone: sesizare.zone,
        location: sesizare.location,
      },
    }));

    await this.notificationsService.createMany(notifications);
  }

  private async notifyOnResolution(sesizare: ControlSesizare, resolverUserId: string): Promise<void> {
    const resolver = await this.userRepository.findOne({ where: { id: resolverUserId } });
    const resolverName = resolver?.fullName || 'Un utilizator';

    const typeLabel = CONTROL_SESIZARE_TYPE_LABELS[sesizare.type];

    // Lista utilizatorilor care trebuie notificati
    const usersToNotify: User[] = [];

    // 1. Creatorul sesizarii
    if (sesizare.createdBy !== resolverUserId) {
      const creator = await this.userRepository.findOne({ where: { id: sesizare.createdBy } });
      if (creator) {
        usersToNotify.push(creator);
      }
    }

    // 2. Toti userii din Control
    const controlDept = await this.departmentRepository.findOne({
      where: { name: CONTROL_DEPARTMENT_NAME },
    });
    if (controlDept) {
      const controlUsers = await this.userRepository.find({
        where: { departmentId: controlDept.id, isActive: true },
      });
      usersToNotify.push(...controlUsers.filter(u => u.id !== resolverUserId));
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

    // Trimite notificari in-app
    const notifications = uniqueUsers.map(user => ({
      userId: user.id,
      type: NotificationType.CONTROL_SESIZARE_RESOLVED,
      title: `Sesizare finalizata: ${typeLabel}`,
      message: `Sesizarea de tip "${typeLabel}" la locatia ${sesizare.location} a fost finalizata de ${resolverName}.`,
      data: {
        controlSesizareId: sesizare.id,
        type: sesizare.type,
        location: sesizare.location,
        resolutionDescription: sesizare.resolutionDescription,
      },
    }));

    await this.notificationsService.createMany(notifications);
  }

  private async notifyAboutComment(sesizare: ControlSesizare, commenterUserId: string, commentContent: string): Promise<void> {
    const commenter = await this.userRepository.findOne({ where: { id: commenterUserId } });
    const commenterName = commenter?.fullName || 'Un utilizator';

    const typeLabel = CONTROL_SESIZARE_TYPE_LABELS[sesizare.type];

    // Notifica creatorul sesizarii (daca nu e el cel care comenteaza)
    if (sesizare.createdBy !== commenterUserId) {
      await this.notificationsService.create({
        userId: sesizare.createdBy,
        type: NotificationType.CONTROL_SESIZARE_RESOLVED,
        title: 'Comentariu nou la sesizare',
        message: `${commenterName} a adaugat un comentariu la sesizarea ta de tip "${typeLabel}".`,
        data: {
          controlSesizareId: sesizare.id,
          type: sesizare.type,
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
          type: NotificationType.CONTROL_SESIZARE_RESOLVED,
          title: 'Comentariu nou la sesizare control',
          message: `${commenterName} a adaugat un comentariu la sesizarea "${typeLabel}" de la ${sesizare.location}.`,
          data: {
            controlSesizareId: sesizare.id,
            type: sesizare.type,
          },
        }));

        await this.notificationsService.createMany(notifications);
      }
    }
  }
}
