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
import { INTERNAL_MAINTENANCE_COMPANIES, MAINTENANCE_DEPARTMENT_NAME, DISPECERAT_DEPARTMENT_NAME } from './constants/parking.constants';
import { EmailService } from '../../common/email/email.service';
import { removeDiacritics } from '../../common/utils/remove-diacritics';

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
      description: removeDiacritics(dto.description),
      createdBy: userId,
      lastModifiedBy: userId,
      status: 'ACTIVE',
    });

    const savedIssue = await this.parkingIssueRepository.save(issue);

    // Inregistreaza in history
    await this.recordHistory(savedIssue.id, 'CREATED', userId, {
      parkingLotId: dto.parkingLotId,
      equipment: dto.equipment,
      contactedCompany: dto.contactedCompany,
    });

    // Daca firma contactata este una dintre cele interne, notifica si aloca
    if (INTERNAL_MAINTENANCE_COMPANIES.includes(dto.contactedCompany as any)) {
      await this.notifyMaintenanceTeam(savedIssue);
    }

    // Notifica managerii si adminii
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

    // Inregistreaza in history
    if (Object.keys(changes).length > 0) {
      await this.recordHistory(id, 'UPDATED', userId, changes);

      // Notifica managerii si adminii despre modificare
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

    // Obtine numele parcarii si creatorul
    const issueWithParkingLot = await this.parkingIssueRepository.findOne({
      where: { id: issue.id },
      relations: ['parkingLot', 'creator'],
    });

    const parkingName = issueWithParkingLot?.parkingLot?.name || 'parcare';
    const creatorName = issueWithParkingLot?.creator?.fullName || 'Un utilizator';

    // Trimite notificari in-app catre toti userii din echipa de intretinere
    const notifications = maintenanceUsers.map(user => ({
      userId: user.id,
      type: NotificationType.PARKING_ISSUE_ASSIGNED,
      title: 'Problema noua de rezolvat',
      message: `O noua problema la ${parkingName} (${issue.equipment}) necesita atentia ta.`,
      data: {
        issueId: issue.id,
        parkingLotId: issue.parkingLotId,
        equipment: issue.equipment,
        contactedCompany: issue.contactedCompany,
      },
    }));

    await this.notificationsService.createMany(notifications);

    // Emailurile individuale au fost eliminate - se trimite rezumat zilnic centralizat
  }

  private async notifyManagersAndAdmins(
    issue: ParkingIssue,
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
    const issueWithParkingLot = await this.parkingIssueRepository.findOne({
      where: { id: issue.id },
      relations: ['parkingLot'],
    });
    const parkingName = issueWithParkingLot?.parkingLot?.name || 'parcare';

    let title: string;
    let message: string;

    switch (action) {
      case 'CREATED':
        title = 'Problema noua creata';
        message = `${actorName} a creat o problema noua la ${parkingName} (${issue.equipment}).`;
        break;
      case 'UPDATED':
        title = 'Problema modificata';
        message = `${actorName} a modificat problema de la ${parkingName} (${issue.equipment}).`;
        break;
      case 'RESOLVED':
        title = 'Problema finalizata';
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

    // Emailurile individuale au fost eliminate - se trimite rezumat zilnic centralizat
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
    // Verifica daca userul este din departamentul Intretinere Parcari
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['department'],
    });

    if (!user?.department || removeDiacritics(user.department.name) !== MAINTENANCE_DEPARTMENT_NAME) {
      return [];
    }

    // Returneaza toate problemele ACTIVE care au firma din lista interna
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
      throw new NotFoundException(`Problema cu ID ${id} nu a fost gasita`);
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
      throw new ForbiddenException('Aceasta problema este deja finalizata');
    }

    issue.status = 'FINALIZAT';
    issue.resolutionDescription = dto.resolutionDescription;
    issue.resolvedBy = userId;
    issue.lastModifiedBy = userId;
    issue.resolvedAt = new Date();
    issue.isUrgent = false; // Reseteaza urgenta la finalizare

    await this.parkingIssueRepository.save(issue);

    // Inregistreaza in history
    await this.recordHistory(id, 'RESOLVED', userId, {
      resolutionDescription: dto.resolutionDescription,
    });

    // Obtine rezolvatorul
    const resolver = await this.userRepository.findOne({ where: { id: userId } });
    const resolverName = resolver?.fullName || 'Un utilizator';

    // Notifica creatorul problemei ca a fost rezolvata
    if (issue.createdBy !== userId) {
      // Notificare in-app
      await this.notificationsService.create({
        userId: issue.createdBy,
        type: NotificationType.PARKING_ISSUE_RESOLVED,
        title: 'Problema rezolvata',
        message: `Problema la ${issue.parkingLot?.name || 'parcare'} (${issue.equipment}) a fost rezolvata.`,
        data: {
          issueId: issue.id,
          parkingLotId: issue.parkingLotId,
          equipment: issue.equipment,
          resolutionDescription: dto.resolutionDescription,
        },
      });

      // Email individual eliminat - se trimite rezumat zilnic centralizat
    }

    // Notifica managerii si adminii
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
        title: 'Comentariu nou la problema',
        message: `${actor?.fullName || 'Un utilizator'} a adaugat un comentariu la problema de la ${issue.parkingLot?.name || 'parcare'}.`,
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
      throw new ForbiddenException('Doar administratorii pot sterge problemele');
    }

    const issue = await this.findOne(id);

    // Inregistreaza in history inainte de stergere
    await this.recordHistory(id, 'DELETED', user.id, {
      equipment: issue.equipment,
      parkingLotId: issue.parkingLotId,
    });

    await this.parkingIssueRepository.remove(issue);
  }

  // Metoda pentru marcarea problemelor urgente (48h)
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

  // Notifica toti userii despre problemele urgente
  async notifyUrgentIssues(): Promise<void> {
    const urgentIssues = await this.findUrgent();

    if (urgentIssues.length === 0) return;

    // Gaseste toti userii care au acces la parcari
    const usersWithAccess = await this.getUsersWithParkingAccess();

    for (const issue of urgentIssues) {
      const notifications = usersWithAccess.map(user => ({
        userId: user.id,
        type: NotificationType.PARKING_ISSUE_ASSIGNED,
        title: '⚠️ URGENT: Problema nerezolvata 48h+',
        message: `Problema la ${issue.parkingLot?.name || 'parcare'} (${issue.equipment}) nu a fost rezolvata de peste 48 de ore!`,
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
    // Gaseste departamentul Dispecerat
    const dispeceratDept = await this.departmentRepository.findOne({
      where: { name: DISPECERAT_DEPARTMENT_NAME },
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
