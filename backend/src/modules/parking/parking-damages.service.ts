import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingDamage, ParkingDamageStatus } from './entities/parking-damage.entity';
import { ParkingDamageComment } from './entities/parking-damage-comment.entity';
import { ParkingHistory } from './entities/parking-history.entity';
import { CreateParkingDamageDto } from './dto/create-parking-damage.dto';
import { ResolveDamageDto } from './dto/resolve-damage.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { EmailService } from '../../common/email/email.service';
import { MAINTENANCE_DEPARTMENT_NAME, DISPECERAT_DEPARTMENT_NAME } from './constants/parking.constants';
import { removeDiacritics } from '../../common/utils/remove-diacritics';

@Injectable()
export class ParkingDamagesService {
  constructor(
    @InjectRepository(ParkingDamage)
    private readonly parkingDamageRepository: Repository<ParkingDamage>,
    @InjectRepository(ParkingDamageComment)
    private readonly commentRepository: Repository<ParkingDamageComment>,
    @InjectRepository(ParkingHistory)
    private readonly historyRepository: Repository<ParkingHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, dto: CreateParkingDamageDto): Promise<ParkingDamage> {
    const damage = this.parkingDamageRepository.create({
      ...dto,
      personName: removeDiacritics(dto.personName),
      description: removeDiacritics(dto.description),
      createdBy: userId,
      lastModifiedBy: userId,
      status: 'ACTIVE',
    });

    const savedDamage = await this.parkingDamageRepository.save(damage);

    // Inregistreaza in history
    await this.recordHistory(savedDamage.id, 'CREATED', userId, {
      parkingLotId: dto.parkingLotId,
      damagedEquipment: dto.damagedEquipment,
      personName: dto.personName,
      carPlate: dto.carPlate,
    });

    // Notifica managerii si adminii
    await this.notifyManagersAndAdmins(savedDamage, 'CREATED', userId);

    return this.findOne(savedDamage.id);
  }

  private async recordHistory(
    entityId: string,
    action: 'CREATED' | 'UPDATED' | 'RESOLVED' | 'DELETED',
    userId: string,
    changes?: Record<string, any>,
  ): Promise<void> {
    const history = this.historyRepository.create({
      entityType: 'DAMAGE',
      entityId,
      action,
      userId,
      changes,
    });
    await this.historyRepository.save(history);
  }

  private async notifyManagersAndAdmins(
    damage: ParkingDamage,
    action: 'CREATED' | 'UPDATED' | 'RESOLVED',
    actorUserId: string,
  ): Promise<void> {
    // Gaseste toti managerii si adminii activi
    const managersAndAdmins = await this.userRepository.find({
      where: [
        { role: UserRole.ADMIN, isActive: true },
        { role: UserRole.MANAGER, isActive: true },
      ],
    });

    // Exclude actorul din lista de notificati
    const toNotify = managersAndAdmins.filter(u => u.id !== actorUserId);

    if (toNotify.length === 0) return;

    // Obtine detaliile actorului
    const actor = await this.userRepository.findOne({ where: { id: actorUserId } });
    const actorName = actor?.fullName || 'Un utilizator';

    // Obtine parcarea
    const damageWithParkingLot = await this.parkingDamageRepository.findOne({
      where: { id: damage.id },
      relations: ['parkingLot'],
    });
    const parkingName = damageWithParkingLot?.parkingLot?.name || 'parcare';

    let title: string;
    let message: string;

    switch (action) {
      case 'CREATED':
        title = 'Prejudiciu nou creat';
        message = `${actorName} a inregistrat un prejudiciu nou la ${parkingName} (${damage.damagedEquipment}).`;
        break;
      case 'UPDATED':
        title = 'Prejudiciu modificat';
        message = `${actorName} a modificat prejudiciul de la ${parkingName} (${damage.damagedEquipment}).`;
        break;
      case 'RESOLVED':
        title = 'Prejudiciu finalizat';
        message = `${actorName} a finalizat prejudiciul de la ${parkingName} (${damage.damagedEquipment}).`;
        break;
    }

    const notifications = toNotify.map(user => ({
      userId: user.id,
      type: NotificationType.PARKING_ISSUE_RESOLVED,
      title,
      message,
      data: {
        damageId: damage.id,
        parkingLotId: damage.parkingLotId,
        damagedEquipment: damage.damagedEquipment,
        action,
      },
    }));

    await this.notificationsService.createMany(notifications);

    // Emailurile individuale au fost eliminate - se trimite un email centralizat zilnic
    // via ParkingUrgentScheduler.sendDailyParkingSummary()
  }

  async findAll(status?: ParkingDamageStatus): Promise<ParkingDamage[]> {
    const query = this.parkingDamageRepository.createQueryBuilder('damage')
      .leftJoinAndSelect('damage.parkingLot', 'parkingLot')
      .leftJoinAndSelect('damage.creator', 'creator')
      .leftJoinAndSelect('damage.resolver', 'resolver')
      .leftJoinAndSelect('damage.lastModifier', 'lastModifier');

    if (status) {
      query.where('damage.status = :status', { status });
    }

    return query.orderBy('damage.isUrgent', 'DESC')
      .addOrderBy('damage.createdAt', 'DESC')
      .getMany();
  }

  async findUrgent(): Promise<ParkingDamage[]> {
    return this.parkingDamageRepository.createQueryBuilder('damage')
      .leftJoinAndSelect('damage.parkingLot', 'parkingLot')
      .leftJoinAndSelect('damage.creator', 'creator')
      .where('damage.isUrgent = :isUrgent', { isUrgent: true })
      .andWhere('damage.status = :status', { status: 'ACTIVE' })
      .orderBy('damage.createdAt', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<ParkingDamage> {
    const damage = await this.parkingDamageRepository.findOne({
      where: { id },
      relations: ['parkingLot', 'creator', 'resolver', 'lastModifier', 'comments', 'comments.user'],
    });

    if (!damage) {
      throw new NotFoundException(`Prejudiciul cu ID ${id} nu a fost gasit`);
    }

    return damage;
  }

  async getHistory(id: string): Promise<ParkingHistory[]> {
    return this.historyRepository.find({
      where: { entityType: 'DAMAGE', entityId: id },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async resolve(id: string, userId: string, dto: ResolveDamageDto): Promise<ParkingDamage> {
    const damage = await this.findOne(id);

    if (damage.status === 'FINALIZAT') {
      throw new ForbiddenException('Acest prejudiciu este deja finalizat');
    }

    damage.status = 'FINALIZAT';
    damage.resolutionType = dto.resolutionType;
    damage.resolutionDescription = dto.resolutionDescription;
    damage.resolvedBy = userId;
    damage.lastModifiedBy = userId;
    damage.resolvedAt = new Date();
    damage.isUrgent = false; // Reseteaza urgenta

    await this.parkingDamageRepository.save(damage);

    // Inregistreaza in history
    await this.recordHistory(id, 'RESOLVED', userId, {
      resolutionType: dto.resolutionType,
      resolutionDescription: dto.resolutionDescription,
    });

    // Notifica creatorul prejudiciului ca a fost rezolvat (daca nu e acelasi user)
    if (damage.createdBy !== userId) {
      const creator = await this.userRepository.findOne({ where: { id: damage.createdBy } });
      if (creator) {
        // Notificare in-app
        await this.notificationsService.create({
          userId: damage.createdBy,
          type: NotificationType.PARKING_ISSUE_RESOLVED,
          title: 'Prejudiciu finalizat',
          message: `Prejudiciul la ${damage.parkingLot?.name || 'parcare'} (${damage.damagedEquipment}) a fost finalizat.`,
          data: {
            damageId: damage.id,
            parkingLotId: damage.parkingLotId,
            damagedEquipment: damage.damagedEquipment,
            resolutionType: dto.resolutionType,
            resolutionDescription: dto.resolutionDescription,
          },
        });

        // Email individual eliminat - se trimite rezumat zilnic centralizat
      }
    }

    // Notifica managerii si adminii
    await this.notifyManagersAndAdmins(damage, 'RESOLVED', userId);

    return this.findOne(id);
  }

  async addComment(damageId: string, userId: string, dto: CreateCommentDto): Promise<ParkingDamageComment> {
    const damage = await this.findOne(damageId);

    const comment = this.commentRepository.create({
      damageId,
      userId,
      content: dto.content,
    });

    await this.commentRepository.save(comment);

    // Notifica managerii si adminii despre comentariu
    const managersAndAdmins = await this.userRepository.find({
      where: [
        { role: UserRole.ADMIN, isActive: true },
        { role: UserRole.MANAGER, isActive: true },
      ],
    });

    const actor = await this.userRepository.findOne({ where: { id: userId } });
    const toNotify = managersAndAdmins.filter(u => u.id !== userId);

    if (toNotify.length > 0) {
      const notifications = toNotify.map(user => ({
        userId: user.id,
        type: NotificationType.PARKING_ISSUE_RESOLVED,
        title: 'Comentariu nou la prejudiciu',
        message: `${actor?.fullName || 'Un utilizator'} a adaugat un comentariu la prejudiciul de la ${damage.parkingLot?.name || 'parcare'}.`,
        data: {
          damageId: damage.id,
          commentId: comment.id,
        },
      }));

      await this.notificationsService.createMany(notifications);
    }

    return this.commentRepository.findOne({
      where: { id: comment.id },
      relations: ['user'],
    });
  }

  async getComments(damageId: string): Promise<ParkingDamageComment[]> {
    return this.commentRepository.find({
      where: { damageId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: string, user: User): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Doar administratorii pot sterge prejudiciile');
    }

    const damage = await this.findOne(id);

    // Inregistreaza in history
    await this.recordHistory(id, 'DELETED', user.id, {
      damagedEquipment: damage.damagedEquipment,
      parkingLotId: damage.parkingLotId,
    });

    await this.parkingDamageRepository.remove(damage);
  }

  // Metoda pentru marcarea prejudiciilor urgente (48h)
  async markUrgentDamages(): Promise<number> {
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const result = await this.parkingDamageRepository
      .createQueryBuilder()
      .update(ParkingDamage)
      .set({ isUrgent: true })
      .where('status = :status', { status: 'ACTIVE' })
      .andWhere('isUrgent = :isUrgent', { isUrgent: false })
      .andWhere('createdAt <= :date', { date: fortyEightHoursAgo })
      .execute();

    return result.affected || 0;
  }

  // Metoda pentru obtinerea tuturor prejudiciilor active (pentru rapoarte/reminder-uri)
  async findAllActive(): Promise<ParkingDamage[]> {
    return this.parkingDamageRepository.createQueryBuilder('damage')
      .leftJoinAndSelect('damage.parkingLot', 'parkingLot')
      .leftJoinAndSelect('damage.creator', 'creator')
      .where('damage.status = :status', { status: 'ACTIVE' })
      .orderBy('damage.isUrgent', 'DESC')
      .addOrderBy('damage.createdAt', 'ASC')
      .getMany();
  }

  // Metoda pentru obtinerea userilor din Dispecerat si Intretinere Parcari
  async getUsersForReminders(): Promise<User[]> {
    // Gaseste departamentele Dispecerat si Intretinere Parcari
    const dispeceratDept = await this.departmentRepository.findOne({
      where: { name: DISPECERAT_DEPARTMENT_NAME },
    });

    const maintenanceDept = await this.departmentRepository.findOne({
      where: { name: MAINTENANCE_DEPARTMENT_NAME },
    });

    const users = await this.userRepository.find({
      where: [
        { role: UserRole.ADMIN, isActive: true },
        { role: UserRole.MANAGER, isActive: true },
        ...(dispeceratDept ? [{ departmentId: dispeceratDept.id, isActive: true }] : []),
        ...(maintenanceDept ? [{ departmentId: maintenanceDept.id, isActive: true }] : []),
      ],
    });

    return users;
  }
}
