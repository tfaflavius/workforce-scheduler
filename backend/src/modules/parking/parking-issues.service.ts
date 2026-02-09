import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { ParkingIssue, ParkingIssueStatus } from './entities/parking-issue.entity';
import { ParkingIssueComment } from './entities/parking-issue-comment.entity';
import { ParkingHistory } from './entities/parking-history.entity';
import { CreateParkingIssueDto } from './dto/create-parking-issue.dto';
import { UpdateParkingIssueDto } from './dto/update-parking-issue.dto';
import { ResolveIssueDto } from './dto/resolve-issue.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { INTERNAL_MAINTENANCE_COMPANIES, MAINTENANCE_DEPARTMENT_NAME } from './constants/parking.constants';
import { EmailService } from '../../common/email/email.service';

@Injectable()
export class ParkingIssuesService {
  constructor(
    @InjectRepository(ParkingIssue)
    private readonly parkingIssueRepository: Repository<ParkingIssue>,
    @InjectRepository(ParkingIssueComment)
    private readonly commentRepository: Repository<ParkingIssueComment>,
    @InjectRepository(ParkingHistory)
    private readonly historyRepository: Repository<ParkingHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, dto: CreateParkingIssueDto): Promise<ParkingIssue> {
    const issue = this.parkingIssueRepository.create({
      ...dto,
      createdBy: userId,
      lastModifiedBy: userId,
      status: 'ACTIVE',
    });

    const savedIssue = await this.parkingIssueRepository.save(issue);

    // Înregistrează în history
    await this.recordHistory(savedIssue.id, 'CREATED', userId, {
      parkingLotId: dto.parkingLotId,
      equipment: dto.equipment,
      contactedCompany: dto.contactedCompany,
    });

    // Dacă firma contactată este una dintre cele interne, notifică și alocă
    if (INTERNAL_MAINTENANCE_COMPANIES.includes(dto.contactedCompany as any)) {
      await this.notifyMaintenanceTeam(savedIssue);
    }

    // Notifică managerii și adminii
    await this.notifyManagersAndAdmins(savedIssue, 'CREATED', userId);

    return this.findOne(savedIssue.id);
  }

  async update(id: string, userId: string, dto: UpdateParkingIssueDto): Promise<ParkingIssue> {
    const issue = await this.findOne(id);

    const changes: Record<string, any> = {};

    if (dto.equipment && dto.equipment !== issue.equipment) {
      changes.equipment = { from: issue.equipment, to: dto.equipment };
      issue.equipment = dto.equipment;
    }
    if (dto.contactedCompany && dto.contactedCompany !== issue.contactedCompany) {
      changes.contactedCompany = { from: issue.contactedCompany, to: dto.contactedCompany };
      issue.contactedCompany = dto.contactedCompany;
    }
    if (dto.description && dto.description !== issue.description) {
      changes.description = { from: issue.description, to: dto.description };
      issue.description = dto.description;
    }

    issue.lastModifiedBy = userId;

    await this.parkingIssueRepository.save(issue);

    // Înregistrează în history
    if (Object.keys(changes).length > 0) {
      await this.recordHistory(id, 'UPDATED', userId, changes);

      // Notifică managerii și adminii despre modificare
      await this.notifyManagersAndAdmins(issue, 'UPDATED', userId);
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
      entityType: 'ISSUE',
      entityId,
      action,
      userId,
      changes,
    });
    await this.historyRepository.save(history);
  }

  private async notifyMaintenanceTeam(issue: ParkingIssue): Promise<void> {
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

    // Obține numele parcării și creatorul
    const issueWithParkingLot = await this.parkingIssueRepository.findOne({
      where: { id: issue.id },
      relations: ['parkingLot', 'creator'],
    });

    const parkingName = issueWithParkingLot?.parkingLot?.name || 'parcare';
    const creatorName = issueWithParkingLot?.creator?.fullName || 'Un utilizator';

    // Trimite notificări in-app către toți userii din echipa de întreținere
    const notifications = maintenanceUsers.map(user => ({
      userId: user.id,
      type: NotificationType.PARKING_ISSUE_ASSIGNED,
      title: 'Problemă nouă de rezolvat',
      message: `O nouă problemă la ${parkingName} (${issue.equipment}) necesită atenția ta.`,
      data: {
        issueId: issue.id,
        parkingLotId: issue.parkingLotId,
        equipment: issue.equipment,
        contactedCompany: issue.contactedCompany,
      },
    }));

    await this.notificationsService.createMany(notifications);

    // Trimite email-uri către toți userii din echipa de întreținere
    for (const user of maintenanceUsers) {
      await this.emailService.sendParkingIssueNotification({
        recipientEmail: user.email,
        recipientName: user.fullName,
        parkingLotName: parkingName,
        equipment: issue.equipment,
        description: issue.description,
        isUrgent: issue.isUrgent || false,
        creatorName: creatorName,
        issueType: 'new_issue',
      });
    }
  }

  private async notifyManagersAndAdmins(
    issue: ParkingIssue,
    action: 'CREATED' | 'UPDATED' | 'RESOLVED',
    actorUserId: string,
  ): Promise<void> {
    // Găsește toți managerii și adminii activi
    const managersAndAdmins = await this.userRepository.find({
      where: [
        { role: UserRole.ADMIN, isActive: true },
        { role: UserRole.MANAGER, isActive: true },
      ],
    });

    // Exclude actorul din lista de notificați
    const toNotify = managersAndAdmins.filter(u => u.id !== actorUserId);

    if (toNotify.length === 0) return;

    // Obține detaliile actorului
    const actor = await this.userRepository.findOne({ where: { id: actorUserId } });
    const actorName = actor?.fullName || 'Un utilizator';

    // Obține parcarea
    const issueWithParkingLot = await this.parkingIssueRepository.findOne({
      where: { id: issue.id },
      relations: ['parkingLot'],
    });
    const parkingName = issueWithParkingLot?.parkingLot?.name || 'parcare';

    let title: string;
    let message: string;

    switch (action) {
      case 'CREATED':
        title = 'Problemă nouă creată';
        message = `${actorName} a creat o problemă nouă la ${parkingName} (${issue.equipment}).`;
        break;
      case 'UPDATED':
        title = 'Problemă modificată';
        message = `${actorName} a modificat problema de la ${parkingName} (${issue.equipment}).`;
        break;
      case 'RESOLVED':
        title = 'Problemă finalizată';
        message = `${actorName} a finalizat problema de la ${parkingName} (${issue.equipment}).`;
        break;
    }

    const notifications = toNotify.map(user => ({
      userId: user.id,
      type: NotificationType.PARKING_ISSUE_RESOLVED,
      title,
      message,
      data: {
        issueId: issue.id,
        parkingLotId: issue.parkingLotId,
        equipment: issue.equipment,
        action,
      },
    }));

    await this.notificationsService.createMany(notifications);

    // Trimite emailuri către manageri și admini pentru probleme noi
    if (action === 'CREATED') {
      for (const user of toNotify) {
        await this.emailService.sendParkingIssueNotification({
          recipientEmail: user.email,
          recipientName: user.fullName,
          parkingLotName: parkingName,
          equipment: issue.equipment,
          description: issue.description,
          isUrgent: issue.isUrgent || false,
          creatorName: actorName,
          issueType: 'new_issue',
        });
      }
    }
  }

  async findAll(status?: ParkingIssueStatus): Promise<ParkingIssue[]> {
    const query = this.parkingIssueRepository.createQueryBuilder('issue')
      .leftJoinAndSelect('issue.parkingLot', 'parkingLot')
      .leftJoinAndSelect('issue.creator', 'creator')
      .leftJoinAndSelect('issue.assignee', 'assignee')
      .leftJoinAndSelect('issue.resolver', 'resolver')
      .leftJoinAndSelect('issue.lastModifier', 'lastModifier');

    if (status) {
      query.where('issue.status = :status', { status });
    }

    return query.orderBy('issue.isUrgent', 'DESC')
      .addOrderBy('issue.createdAt', 'DESC')
      .getMany();
  }

  async findUrgent(): Promise<ParkingIssue[]> {
    return this.parkingIssueRepository.createQueryBuilder('issue')
      .leftJoinAndSelect('issue.parkingLot', 'parkingLot')
      .leftJoinAndSelect('issue.creator', 'creator')
      .where('issue.isUrgent = :isUrgent', { isUrgent: true })
      .andWhere('issue.status = :status', { status: 'ACTIVE' })
      .orderBy('issue.createdAt', 'ASC')
      .getMany();
  }

  async findMyAssigned(userId: string): Promise<ParkingIssue[]> {
    // Verifică dacă userul este din departamentul Întreținere Parcări
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['department'],
    });

    if (!user?.department || user.department.name !== MAINTENANCE_DEPARTMENT_NAME) {
      return [];
    }

    // Returnează toate problemele ACTIVE care au firma din lista internă
    return this.parkingIssueRepository.createQueryBuilder('issue')
      .leftJoinAndSelect('issue.parkingLot', 'parkingLot')
      .leftJoinAndSelect('issue.creator', 'creator')
      .where('issue.status = :status', { status: 'ACTIVE' })
      .andWhere('issue.contactedCompany IN (:...companies)', {
        companies: INTERNAL_MAINTENANCE_COMPANIES
      })
      .orderBy('issue.isUrgent', 'DESC')
      .addOrderBy('issue.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<ParkingIssue> {
    const issue = await this.parkingIssueRepository.findOne({
      where: { id },
      relations: ['parkingLot', 'creator', 'assignee', 'resolver', 'lastModifier', 'comments', 'comments.user'],
    });

    if (!issue) {
      throw new NotFoundException(`Problema cu ID ${id} nu a fost găsită`);
    }

    return issue;
  }

  async getHistory(id: string): Promise<ParkingHistory[]> {
    return this.historyRepository.find({
      where: { entityType: 'ISSUE', entityId: id },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async resolve(id: string, userId: string, dto: ResolveIssueDto): Promise<ParkingIssue> {
    const issue = await this.findOne(id);

    if (issue.status === 'FINALIZAT') {
      throw new ForbiddenException('Această problemă este deja finalizată');
    }

    issue.status = 'FINALIZAT';
    issue.resolutionDescription = dto.resolutionDescription;
    issue.resolvedBy = userId;
    issue.lastModifiedBy = userId;
    issue.resolvedAt = new Date();
    issue.isUrgent = false; // Resetează urgența la finalizare

    await this.parkingIssueRepository.save(issue);

    // Înregistrează în history
    await this.recordHistory(id, 'RESOLVED', userId, {
      resolutionDescription: dto.resolutionDescription,
    });

    // Obține rezolvatorul
    const resolver = await this.userRepository.findOne({ where: { id: userId } });
    const resolverName = resolver?.fullName || 'Un utilizator';

    // Notifică creatorul problemei că a fost rezolvată
    if (issue.createdBy !== userId) {
      // Notificare in-app
      await this.notificationsService.create({
        userId: issue.createdBy,
        type: NotificationType.PARKING_ISSUE_RESOLVED,
        title: 'Problemă rezolvată',
        message: `Problema la ${issue.parkingLot?.name || 'parcare'} (${issue.equipment}) a fost rezolvată.`,
        data: {
          issueId: issue.id,
          parkingLotId: issue.parkingLotId,
          equipment: issue.equipment,
          resolutionDescription: dto.resolutionDescription,
        },
      });

      // Email către creator
      const creator = await this.userRepository.findOne({ where: { id: issue.createdBy } });
      if (creator) {
        await this.emailService.sendParkingIssueNotification({
          recipientEmail: creator.email,
          recipientName: creator.fullName,
          parkingLotName: issue.parkingLot?.name || 'parcare',
          equipment: issue.equipment,
          description: issue.description,
          isUrgent: false,
          creatorName: resolverName,
          issueType: 'issue_resolved',
          resolutionDescription: dto.resolutionDescription,
        });
      }
    }

    // Notifică managerii și adminii
    await this.notifyManagersAndAdmins(issue, 'RESOLVED', userId);

    return this.findOne(id);
  }

  async addComment(issueId: string, userId: string, dto: CreateCommentDto): Promise<ParkingIssueComment> {
    const issue = await this.findOne(issueId);

    const comment = this.commentRepository.create({
      issueId,
      userId,
      content: dto.content,
    });

    await this.commentRepository.save(comment);

    // Notifică managerii și adminii despre comentariu
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
        title: 'Comentariu nou la problemă',
        message: `${actor?.fullName || 'Un utilizator'} a adăugat un comentariu la problema de la ${issue.parkingLot?.name || 'parcare'}.`,
        data: {
          issueId: issue.id,
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

  async getComments(issueId: string): Promise<ParkingIssueComment[]> {
    return this.commentRepository.find({
      where: { issueId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: string, user: User): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Doar administratorii pot șterge problemele');
    }

    const issue = await this.findOne(id);

    // Înregistrează în history înainte de ștergere
    await this.recordHistory(id, 'DELETED', user.id, {
      equipment: issue.equipment,
      parkingLotId: issue.parkingLotId,
    });

    await this.parkingIssueRepository.remove(issue);
  }

  // Metodă pentru marcarea problemelor urgente (48h)
  async markUrgentIssues(): Promise<number> {
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const result = await this.parkingIssueRepository
      .createQueryBuilder()
      .update(ParkingIssue)
      .set({ isUrgent: true })
      .where('status = :status', { status: 'ACTIVE' })
      .andWhere('isUrgent = :isUrgent', { isUrgent: false })
      .andWhere('createdAt <= :date', { date: fortyEightHoursAgo })
      .execute();

    return result.affected || 0;
  }

  // Notifică toți userii despre problemele urgente
  async notifyUrgentIssues(): Promise<void> {
    const urgentIssues = await this.findUrgent();

    if (urgentIssues.length === 0) return;

    // Găsește toți userii care au acces la parcări
    const usersWithAccess = await this.getUsersWithParkingAccess();

    for (const issue of urgentIssues) {
      const notifications = usersWithAccess.map(user => ({
        userId: user.id,
        type: NotificationType.PARKING_ISSUE_ASSIGNED,
        title: '⚠️ URGENT: Problemă nerezolvată 48h+',
        message: `Problema la ${issue.parkingLot?.name || 'parcare'} (${issue.equipment}) nu a fost rezolvată de peste 48 de ore!`,
        data: {
          issueId: issue.id,
          parkingLotId: issue.parkingLotId,
          equipment: issue.equipment,
          isUrgent: true,
        },
      }));

      await this.notificationsService.createMany(notifications);
    }
  }

  private async getUsersWithParkingAccess(): Promise<User[]> {
    // Găsește departamentul Dispecerat
    const dispeceratDept = await this.departmentRepository.findOne({
      where: { name: 'Dispecerat' },
    });

    const users = await this.userRepository.find({
      where: [
        { role: UserRole.ADMIN, isActive: true },
        { role: UserRole.MANAGER, isActive: true },
        ...(dispeceratDept ? [{ departmentId: dispeceratDept.id, isActive: true }] : []),
      ],
    });

    return users;
  }
}
