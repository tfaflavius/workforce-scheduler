import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ShiftSwapRequest, ShiftSwapStatus } from './entities/shift-swap-request.entity';
import { ShiftSwapResponse, SwapResponseType } from './entities/shift-swap-response.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { WorkSchedule } from '../schedules/entities/work-schedule.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PushNotificationService } from '../notifications/push-notification.service';
import { EmailService } from '../../common/email/email.service';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { RespondSwapDto } from './dto/respond-swap.dto';
import { AdminApproveSwapDto, AdminRejectSwapDto } from './dto/admin-approve-swap.dto';

@Injectable()
export class ShiftSwapsService {
  private readonly logger = new Logger(ShiftSwapsService.name);

  constructor(
    @InjectRepository(ShiftSwapRequest)
    private readonly swapRequestRepository: Repository<ShiftSwapRequest>,
    @InjectRepository(ShiftSwapResponse)
    private readonly swapResponseRepository: Repository<ShiftSwapResponse>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ScheduleAssignment)
    private readonly assignmentRepository: Repository<ScheduleAssignment>,
    @InjectRepository(WorkSchedule)
    private readonly scheduleRepository: Repository<WorkSchedule>,
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Creeaza o cerere de schimb de tura
   */
  async createSwapRequest(
    requesterId: string,
    dto: CreateSwapRequestDto,
  ): Promise<ShiftSwapRequest> {
    const requester = await this.userRepository.findOne({ where: { id: requesterId } });
    if (!requester) {
      throw new NotFoundException('Utilizatorul nu a fost gasit');
    }

    // Verifica daca solicitantul are o tura in data respectiva
    const requesterAssignment = await this.findAssignmentForUserAndDate(
      requesterId,
      dto.requesterDate,
    );
    if (!requesterAssignment) {
      throw new BadRequestException('Nu ai o tura programata in data selectata');
    }

    // Extrage departmentId si shiftPattern pentru filtrare
    const departmentId = requester.departmentId || undefined;
    const shiftPattern = requesterAssignment.schedule?.shiftPattern || undefined;

    // Gaseste userii care lucreaza in data tinta (filtrare pe departament + regim ore)
    const targetUsers = await this.findUsersWorkingOnDate(
      dto.targetDate,
      requesterId,
      departmentId,
      shiftPattern,
    );
    if (targetUsers.length === 0) {
      throw new BadRequestException('Nu exista alti utilizatori care lucreaza in data selectata');
    }

    // Verifica daca nu exista deja o cerere activa pentru aceeasi data
    const existingRequest = await this.swapRequestRepository.findOne({
      where: {
        requesterId,
        requesterDate: new Date(dto.requesterDate),
        status: In([ShiftSwapStatus.PENDING, ShiftSwapStatus.AWAITING_ADMIN]),
      },
    });
    if (existingRequest) {
      throw new BadRequestException('Ai deja o cerere activa pentru aceasta data');
    }

    // Obtine tipul de tura
    const targetAssignment = await this.findAnyAssignmentForDate(dto.targetDate);

    // Creeaza cererea
    const swapRequest = this.swapRequestRepository.create({
      requesterId,
      requesterDate: new Date(dto.requesterDate),
      requesterShiftType: requesterAssignment.notes || 'Tura',
      targetDate: new Date(dto.targetDate),
      targetShiftType: targetAssignment?.notes || 'Tura',
      reason: dto.reason,
      status: ShiftSwapStatus.PENDING,
    });

    const savedRequest = await this.swapRequestRepository.save(swapRequest);

    // Trimite notificari (non-blocking - nu blocam crearea cererii daca notificarile esueaza)
    try {
      await this.sendSwapRequestNotifications(savedRequest, requester, targetUsers);
    } catch (error) {
      this.logger.error(`Failed to send swap request notifications: ${error.message}`, error.stack);
    }

    this.logger.log(`Swap request created: ${savedRequest.id} by user ${requesterId}`);

    return this.findOne(savedRequest.id);
  }

  /**
   * Raspunde la o cerere de schimb
   */
  async respondToSwapRequest(
    swapRequestId: string,
    responderId: string,
    dto: RespondSwapDto,
  ): Promise<ShiftSwapResponse> {
    const swapRequest = await this.findOne(swapRequestId);

    // Verifica statusul - permite raspunsuri atat in PENDING cat si in AWAITING_ADMIN
    // (mai multi colegi pot accepta, adminul alege dintre ei)
    if (![ShiftSwapStatus.PENDING, ShiftSwapStatus.AWAITING_ADMIN].includes(swapRequest.status)) {
      throw new BadRequestException('Aceasta cerere nu mai accepta raspunsuri');
    }

    // Verifica daca userul lucreaza in data tinta
    const targetDateStr = swapRequest.targetDate instanceof Date
      ? swapRequest.targetDate.toISOString().split('T')[0]
      : String(swapRequest.targetDate);
    const responderAssignment = await this.findAssignmentForUserAndDate(
      responderId,
      targetDateStr,
    );
    if (!responderAssignment) {
      throw new ForbiddenException('Nu poti raspunde la aceasta cerere - nu lucrezi in data respectiva');
    }

    // Verifica daca nu a raspuns deja
    const existingResponse = await this.swapResponseRepository.findOne({
      where: { swapRequestId, responderId },
    });
    if (existingResponse) {
      throw new BadRequestException('Ai raspuns deja la aceasta cerere');
    }

    // Creeaza raspunsul
    const response = this.swapResponseRepository.create({
      swapRequestId,
      responderId,
      response: dto.response,
      message: dto.message,
    });

    const savedResponse = await this.swapResponseRepository.save(response);

    // Trimite notificari (non-blocking)
    const responder = await this.userRepository.findOne({ where: { id: responderId } });
    try {
      await this.sendSwapResponseNotifications(swapRequest, responder, dto.response);
    } catch (error) {
      this.logger.error(`Failed to send swap response notifications: ${error.message}`, error.stack);
    }

    // Daca cineva a acceptat, marcheaza cererea ca AWAITING_ADMIN
    // Cererea ramane deschisa pentru alti colegi sa accepte/refuze
    // Adminul va alege din toti cei care au acceptat
    if (dto.response === SwapResponseType.ACCEPTED && swapRequest.status === ShiftSwapStatus.PENDING) {
      await this.swapRequestRepository.update(swapRequestId, {
        status: ShiftSwapStatus.AWAITING_ADMIN,
      });
    }

    this.logger.log(`Swap response: ${dto.response} for request ${swapRequestId} by user ${responderId}`);

    return savedResponse;
  }

  /**
   * Admin aproba schimbul
   * Suporta doua scenarii:
   * 1. Cineva a acceptat (AWAITING_ADMIN) - adminul alege din cei care au acceptat
   * 2. Nimeni nu a acceptat (PENDING) - adminul forteaza alocarea la un coleg
   */
  async adminApproveSwap(
    swapRequestId: string,
    adminId: string,
    dto: AdminApproveSwapDto,
  ): Promise<ShiftSwapRequest> {
    const swapRequest = await this.findOne(swapRequestId);

    // Verifica statusul - acceptam PENDING (force-assign) sau AWAITING_ADMIN (normal)
    if (![ShiftSwapStatus.PENDING, ShiftSwapStatus.AWAITING_ADMIN].includes(swapRequest.status)) {
      throw new BadRequestException('Aceasta cerere nu poate fi aprobata in acest moment');
    }

    // Daca e AWAITING_ADMIN, verificam ca userul ales a acceptat
    if (swapRequest.status === ShiftSwapStatus.AWAITING_ADMIN) {
      const acceptedResponse = swapRequest.responses?.find(
        (r) => r.responderId === dto.approvedResponderId && r.response === SwapResponseType.ACCEPTED,
      );
      if (!acceptedResponse) {
        throw new BadRequestException('Utilizatorul selectat nu a acceptat schimbul');
      }
    }

    // Daca e PENDING (force-assign), verificam ca userul ales lucreaza in data tinta
    if (swapRequest.status === ShiftSwapStatus.PENDING) {
      const targetDateStr = swapRequest.targetDate instanceof Date
        ? swapRequest.targetDate.toISOString().split('T')[0]
        : String(swapRequest.targetDate).split('T')[0];
      const responderAssignment = await this.findAssignmentForUserAndDate(
        dto.approvedResponderId,
        targetDateStr,
      );
      if (!responderAssignment) {
        throw new BadRequestException('Utilizatorul selectat nu lucreaza in data tinta');
      }
    }

    // Efectueaza schimbul in program
    await this.executeSwap(swapRequest, dto.approvedResponderId);

    // Actualizeaza cererea
    await this.swapRequestRepository.update(swapRequestId, {
      status: ShiftSwapStatus.APPROVED,
      approvedResponderId: dto.approvedResponderId,
      adminId,
      adminNotes: dto.adminNotes,
    });

    // Trimite notificari finale (non-blocking)
    try {
      await this.sendSwapApprovedNotifications(swapRequest, dto.approvedResponderId);
    } catch (error) {
      this.logger.error(`Failed to send swap approved notifications: ${error.message}`, error.stack);
    }

    this.logger.log(`Swap approved: ${swapRequestId} by admin ${adminId}`);

    return this.findOne(swapRequestId);
  }

  /**
   * Admin respinge cererea
   */
  async adminRejectSwap(
    swapRequestId: string,
    adminId: string,
    dto: AdminRejectSwapDto,
  ): Promise<ShiftSwapRequest> {
    const swapRequest = await this.findOne(swapRequestId);

    if (![ShiftSwapStatus.PENDING, ShiftSwapStatus.AWAITING_ADMIN].includes(swapRequest.status)) {
      throw new BadRequestException('Aceasta cerere nu poate fi respinsa');
    }

    await this.swapRequestRepository.update(swapRequestId, {
      status: ShiftSwapStatus.REJECTED,
      adminId,
      adminNotes: dto.adminNotes,
    });

    // Trimite notificari (non-blocking)
    try {
      const requesterDateFormatted = this.formatDate(swapRequest.requesterDate);
      const targetDateFormatted = this.formatDate(swapRequest.targetDate);
      const requester = await this.userRepository.findOne({ where: { id: swapRequest.requesterId } });

      // Notifica solicitantul
      await this.notificationsService.create({
        userId: swapRequest.requesterId,
        type: 'SHIFT_SWAP_REJECTED' as any,
        title: 'Cerere de schimb respinsa',
        message: `Cererea ta de schimb pentru ${requesterDateFormatted} a fost respinsa de administrator.${dto.adminNotes ? ` Motiv: ${dto.adminNotes}` : ''}`,
        data: { swapRequestId },
      });

      // Push notification catre solicitant
      await this.pushNotificationService.sendToUser(
        swapRequest.requesterId,
        '❌ Schimb Respins',
        `Cererea ta de schimb pentru ${requesterDateFormatted} a fost respinsa`,
        { url: '/shift-swaps' },
      );

      // Email catre solicitant
      if (requester) {
        await this.emailService.sendShiftSwapNotification({
          recipientEmail: requester.email,
          recipientName: requester.fullName,
          requesterName: requester.fullName,
          requesterDate: requesterDateFormatted,
          targetDate: targetDateFormatted,
          swapType: 'rejected',
          adminNotes: dto.adminNotes,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send swap rejected notifications: ${error.message}`, error.stack);
    }

    this.logger.log(`Swap rejected: ${swapRequestId} by admin ${adminId}`);

    return this.findOne(swapRequestId);
  }

  /**
   * Anuleaza o cerere (doar solicitantul)
   */
  async cancelSwapRequest(
    swapRequestId: string,
    userId: string,
  ): Promise<ShiftSwapRequest> {
    const swapRequest = await this.findOne(swapRequestId);

    if (swapRequest.requesterId !== userId) {
      throw new ForbiddenException('Nu poti anula aceasta cerere');
    }

    if (![ShiftSwapStatus.PENDING, ShiftSwapStatus.AWAITING_ADMIN].includes(swapRequest.status)) {
      throw new BadRequestException('Aceasta cerere nu poate fi anulata');
    }

    await this.swapRequestRepository.update(swapRequestId, {
      status: ShiftSwapStatus.CANCELLED,
    });

    this.logger.log(`Swap cancelled: ${swapRequestId} by user ${userId}`);

    return this.findOne(swapRequestId);
  }

  /**
   * Sterge complet o cerere (admin only)
   * Sterge si toate raspunsurile asociate
   */
  async deleteSwapRequest(swapRequestId: string): Promise<{ deleted: true }> {
    const swapRequest = await this.findOne(swapRequestId);

    // Sterge mai intai raspunsurile asociate
    await this.swapResponseRepository.delete({ swapRequestId });

    // Sterge cererea
    await this.swapRequestRepository.delete(swapRequestId);

    this.logger.log(`Swap request deleted: ${swapRequestId} (requester: ${swapRequest.requester?.fullName})`);

    return { deleted: true };
  }

  /**
   * Gaseste o cerere dupa ID
   */
  async findOne(id: string): Promise<ShiftSwapRequest> {
    const request = await this.swapRequestRepository.findOne({
      where: { id },
      relations: ['requester', 'approvedResponder', 'admin', 'responses', 'responses.responder'],
    });

    if (!request) {
      throw new NotFoundException('Cererea nu a fost gasita');
    }

    return request;
  }

  /**
   * Lista cererilor pentru un user
   */
  async findUserSwapRequests(userId: string): Promise<ShiftSwapRequest[]> {
    // Cererile facute de user sau in care userul poate raspunde
    const userAssignments = await this.assignmentRepository.find({
      where: { userId },
    });
    const userDates = userAssignments.map((a) => a.shiftDate);

    const requests = await this.swapRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.requester', 'requester')
      .leftJoinAndSelect('request.approvedResponder', 'approvedResponder')
      .leftJoinAndSelect('request.responses', 'responses')
      .leftJoinAndSelect('responses.responder', 'responder')
      .where('request.requesterId = :userId', { userId })
      .orWhere('request.targetDate IN (:...dates) AND request.status IN (:...statuses)', {
        dates: userDates.length > 0 ? userDates : ['1970-01-01'],
        statuses: [ShiftSwapStatus.PENDING, ShiftSwapStatus.AWAITING_ADMIN],
      })
      .orderBy('request.createdAt', 'DESC')
      .getMany();

    return requests;
  }

  /**
   * Lista tuturor cererilor (pentru admin)
   */
  async findAllSwapRequests(filters?: {
    status?: ShiftSwapStatus;
  }): Promise<ShiftSwapRequest[]> {
    const query = this.swapRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.requester', 'requester')
      .leftJoinAndSelect('request.approvedResponder', 'approvedResponder')
      .leftJoinAndSelect('request.admin', 'admin')
      .leftJoinAndSelect('request.responses', 'responses')
      .leftJoinAndSelect('responses.responder', 'responder')
      .orderBy('request.createdAt', 'DESC');

    if (filters?.status) {
      query.where('request.status = :status', { status: filters.status });
    }

    return query.getMany();
  }

  /**
   * Gaseste userii care lucreaza intr-o anumita data
   * Optionally filter by departmentId, workPositionId and shiftPattern
   */
  async findUsersWorkingOnDate(
    date: string,
    excludeUserId?: string,
    departmentId?: string,
    shiftPattern?: string,
  ): Promise<User[]> {
    const qb = this.assignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.user', 'user')
      .leftJoin('assignment.schedule', 'schedule')
      .where('assignment.shiftDate = :date', { date })
      .andWhere('user.isActive = true')
      .andWhere('schedule.status = :status', { status: 'APPROVED' });

    if (departmentId) {
      qb.andWhere('user.department_id = :departmentId', { departmentId });
    }

    // NU filtram pe workPositionId - userii din Control pot schimba tura
    // indiferent daca lucreaza la pozitia Control sau Dispecerat

    // Filtreaza pe regimul de ore (8h/12h) - doar colegi cu acelasi regim
    if (shiftPattern) {
      qb.andWhere('schedule.shiftPattern = :shiftPattern', { shiftPattern });
    }

    const assignments = await qb.getMany();

    let users = assignments
      .map((a) => a.user)
      .filter((u) => u && u.id !== excludeUserId);

    // Elimina duplicatele
    const uniqueUsers = users.filter(
      (user, index, self) => index === self.findIndex((u) => u.id === user.id),
    );

    return uniqueUsers;
  }

  /**
   * Gaseste datele disponibile pentru schimb de tura
   * Filtreaza pe departament si work position (doar colegi din acelasi departament)
   */
  async findAvailableSwapDates(
    userDate: string,
    userId: string,
  ): Promise<{ date: string; count: number }[]> {
    // Gaseste user-ul pentru departmentId
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilizatorul nu a fost gasit');
    }

    // Gaseste assignment-ul user-ului pe userDate pentru workPositionId si shiftPattern
    const userAssignment = await this.assignmentRepository.findOne({
      where: { userId, shiftDate: new Date(userDate) },
      relations: ['workPosition', 'schedule'],
    });

    const departmentId = user.departmentId;
    const shiftPattern = userAssignment?.schedule?.shiftPattern || null;

    // Cauta assignment-uri viitoare de la alti useri din acelasi departament si regim
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const qb = this.assignmentRepository
      .createQueryBuilder('assignment')
      .leftJoin('assignment.user', 'user')
      .leftJoin('assignment.schedule', 'schedule')
      .select('assignment.shiftDate', 'shiftDate')
      .addSelect('COUNT(DISTINCT user.id)', 'userCount')
      .where('user.id != :userId', { userId })
      .andWhere('user.isActive = true')
      .andWhere('assignment.shiftDate >= :today', { today: today.toISOString().split('T')[0] })
      .andWhere('schedule.status = :status', { status: 'APPROVED' })
      .andWhere('assignment.isRestDay = false');

    // Filtreaza pe departament (daca exista)
    if (departmentId) {
      qb.andWhere('user.department_id = :departmentId', { departmentId });
    }

    // NU filtram pe workPositionId - userii din Control pot schimba tura
    // indiferent daca lucreaza la pozitia Control sau Dispecerat

    // Filtreaza pe regimul de ore (SHIFT_8H / SHIFT_12H) - doar colegi cu acelasi regim
    if (shiftPattern) {
      qb.andWhere('schedule.shiftPattern = :shiftPattern', { shiftPattern });
    }

    qb.groupBy('assignment.shiftDate')
      .orderBy('assignment.shiftDate', 'ASC');

    const results = await qb.getRawMany();

    return results.map((r) => ({
      date: typeof r.shiftDate === 'string'
        ? r.shiftDate.split('T')[0]
        : new Date(r.shiftDate).toISOString().split('T')[0],
      count: parseInt(r.userCount, 10),
    }));
  }

  // ============ PRIVATE METHODS ============

  private async findAssignmentForUserAndDate(
    userId: string,
    date: string,
  ): Promise<ScheduleAssignment | null> {
    return this.assignmentRepository.findOne({
      where: {
        userId,
        shiftDate: new Date(date),
      },
      relations: ['shiftType', 'workPosition', 'schedule'],
    });
  }

  private async findAnyAssignmentForDate(date: string): Promise<ScheduleAssignment | null> {
    return this.assignmentRepository.findOne({
      where: {
        shiftDate: new Date(date),
      },
    });
  }

  /**
   * Efectueaza schimbul in program
   */
  private async executeSwap(
    swapRequest: ShiftSwapRequest,
    approvedResponderId: string,
  ): Promise<void> {
    const requesterDateStr = swapRequest.requesterDate instanceof Date
      ? swapRequest.requesterDate.toISOString().split('T')[0]
      : String(swapRequest.requesterDate);
    const targetDateStr = swapRequest.targetDate instanceof Date
      ? swapRequest.targetDate.toISOString().split('T')[0]
      : String(swapRequest.targetDate);

    // Gaseste assignment-urile
    const requesterAssignment = await this.findAssignmentForUserAndDate(
      swapRequest.requesterId,
      requesterDateStr,
    );
    const responderAssignment = await this.findAssignmentForUserAndDate(
      approvedResponderId,
      targetDateStr,
    );

    if (!requesterAssignment || !responderAssignment) {
      throw new BadRequestException('Nu s-au gasit turele pentru schimb');
    }

    // Schimba user-ii intre assignment-uri
    const tempUserId = requesterAssignment.userId;

    await this.assignmentRepository.update(requesterAssignment.id, {
      userId: approvedResponderId,
    });

    await this.assignmentRepository.update(responderAssignment.id, {
      userId: tempUserId,
    });

    this.logger.log(`Swap executed: ${swapRequest.requesterId} <-> ${approvedResponderId}`);
  }

  /**
   * Trimite notificari la crearea cererii
   */
  private async sendSwapRequestNotifications(
    request: ShiftSwapRequest,
    requester: User,
    targetUsers: User[],
  ): Promise<void> {
    const requesterDateFormatted = this.formatDate(request.requesterDate);
    const targetDateFormatted = this.formatDate(request.targetDate);

    // Notifica admin-ii
    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
    });

    for (const admin of admins) {
      // Notificare in-app
      await this.notificationsService.create({
        userId: admin.id,
        type: 'SHIFT_SWAP_REQUEST' as any,
        title: 'Cerere noua de schimb de tura',
        message: `${requester.fullName} a solicitat schimb de tura: ${requesterDateFormatted} ↔ ${targetDateFormatted}. Motiv: ${request.reason}`,
        data: { swapRequestId: request.id },
      });

      // Push notification cu URL catre pagina de gestionare schimburi
      await this.pushNotificationService.sendToUser(
        admin.id,
        '🔄 Cerere Schimb de Tura',
        `${requester.fullName}: ${requesterDateFormatted} ↔ ${targetDateFormatted}`,
        { url: '/admin/shift-swaps' },
      );

      // Email catre admin
      await this.emailService.sendShiftSwapNotification({
        recipientEmail: admin.email,
        recipientName: admin.fullName,
        requesterName: requester.fullName,
        requesterDate: requesterDateFormatted,
        targetDate: targetDateFormatted,
        reason: request.reason,
        swapType: 'new_request',
      });
    }

    // Notifica userii care lucreaza in data tinta
    for (const user of targetUsers) {
      // Notificare in-app
      await this.notificationsService.create({
        userId: user.id,
        type: 'SHIFT_SWAP_REQUEST' as any,
        title: 'Cerere de schimb de tura',
        message: `${requester.fullName} doreste sa schimbe tura din ${requesterDateFormatted} cu tura ta din ${targetDateFormatted}. Motiv: ${request.reason}`,
        data: { swapRequestId: request.id },
      });

      // Push notification cu URL catre pagina de schimburi a userului
      await this.pushNotificationService.sendToUser(
        user.id,
        '🔄 Cerere Schimb de Tura',
        `${requester.fullName} doreste sa schimbe tura cu tine (${targetDateFormatted})`,
        { url: '/shift-swaps' },
      );

      // Email catre user
      await this.emailService.sendShiftSwapNotification({
        recipientEmail: user.email,
        recipientName: user.fullName,
        requesterName: requester.fullName,
        requesterDate: requesterDateFormatted,
        targetDate: targetDateFormatted,
        reason: request.reason,
        swapType: 'new_request',
      });
    }
  }

  /**
   * Trimite notificari la raspuns
   */
  private async sendSwapResponseNotifications(
    request: ShiftSwapRequest,
    responder: User,
    responseType: SwapResponseType,
  ): Promise<void> {
    const responseText = responseType === SwapResponseType.ACCEPTED ? 'a acceptat' : 'a refuzat';
    const requesterDateFormatted = this.formatDate(request.requesterDate);
    const targetDateFormatted = this.formatDate(request.targetDate);

    // Obtine solicitantul pentru email
    const requester = await this.userRepository.findOne({ where: { id: request.requesterId } });

    // Notifica solicitantul
    await this.notificationsService.create({
      userId: request.requesterId,
      type: 'SHIFT_SWAP_RESPONSE' as any,
      title: `Raspuns la cererea de schimb`,
      message: `${responder.fullName} ${responseText} cererea ta de schimb pentru ${requesterDateFormatted}.`,
      data: { swapRequestId: request.id },
    });

    // Push notification catre solicitant
    await this.pushNotificationService.sendToUser(
      request.requesterId,
      responseType === SwapResponseType.ACCEPTED ? '✅ Schimb Acceptat' : '❌ Schimb Refuzat',
      `${responder.fullName} ${responseText} schimbul pentru ${requesterDateFormatted}`,
      { url: '/shift-swaps' },
    );

    // Email catre solicitant
    if (requester) {
      await this.emailService.sendShiftSwapNotification({
        recipientEmail: requester.email,
        recipientName: requester.fullName,
        requesterName: requester.fullName,
        requesterDate: requesterDateFormatted,
        targetDate: targetDateFormatted,
        swapType: responseType === SwapResponseType.ACCEPTED ? 'response_accepted' : 'response_declined',
        responderName: responder.fullName,
      });
    }

    // Notifica admin-ii daca cineva a acceptat
    if (responseType === SwapResponseType.ACCEPTED) {
      const admins = await this.userRepository.find({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      for (const admin of admins) {
        // Notificare in-app
        await this.notificationsService.create({
          userId: admin.id,
          type: 'SHIFT_SWAP_RESPONSE' as any,
          title: 'Schimb de tura - acceptare',
          message: `${responder.fullName} a acceptat sa faca schimb cu ${request.requester?.fullName || 'solicitant'}. Asteapta aprobarea ta.`,
          data: { swapRequestId: request.id },
        });

        // Push notification catre admin
        await this.pushNotificationService.sendToUser(
          admin.id,
          '⏳ Schimb Asteapta Aprobare',
          `${responder.fullName} a acceptat schimbul cu ${request.requester?.fullName || 'solicitant'}`,
          { url: '/admin/shift-swaps' },
        );

        // Email catre admin
        await this.emailService.sendShiftSwapNotification({
          recipientEmail: admin.email,
          recipientName: admin.fullName,
          requesterName: requester?.fullName || 'Solicitant',
          requesterDate: requesterDateFormatted,
          targetDate: targetDateFormatted,
          swapType: 'response_accepted',
          responderName: responder.fullName,
        });
      }
    }
  }

  /**
   * Trimite notificari dupa aprobare
   */
  private async sendSwapApprovedNotifications(
    request: ShiftSwapRequest,
    approvedResponderId: string,
  ): Promise<void> {
    const requesterDateFormatted = this.formatDate(request.requesterDate);
    const targetDateFormatted = this.formatDate(request.targetDate);

    const approvedResponder = await this.userRepository.findOne({
      where: { id: approvedResponderId },
    });
    const requester = await this.userRepository.findOne({
      where: { id: request.requesterId },
    });

    // Notifica solicitantul
    await this.notificationsService.create({
      userId: request.requesterId,
      type: 'SHIFT_SWAP_APPROVED' as any,
      title: 'Schimb de tura aprobat!',
      message: `Schimbul tau a fost aprobat! Acum lucrezi in ${targetDateFormatted} in loc de ${requesterDateFormatted}.`,
      data: { swapRequestId: request.id },
    });

    // Push notification catre solicitant
    await this.pushNotificationService.sendToUser(
      request.requesterId,
      '🎉 Schimb Aprobat!',
      `Acum lucrezi in ${targetDateFormatted} in loc de ${requesterDateFormatted}`,
      { url: '/my-schedule' },
    );

    // Email catre solicitant
    if (requester) {
      await this.emailService.sendShiftSwapNotification({
        recipientEmail: requester.email,
        recipientName: requester.fullName,
        requesterName: requester.fullName,
        requesterDate: requesterDateFormatted,
        targetDate: targetDateFormatted,
        swapType: 'approved',
        responderName: approvedResponder?.fullName,
      });
    }

    // Notifica userul aprobat
    await this.notificationsService.create({
      userId: approvedResponderId,
      type: 'SHIFT_SWAP_APPROVED' as any,
      title: 'Schimb de tura aprobat!',
      message: `Schimbul a fost aprobat! Acum lucrezi in ${requesterDateFormatted} in loc de ${targetDateFormatted}.`,
      data: { swapRequestId: request.id },
    });

    // Push notification catre userul aprobat
    await this.pushNotificationService.sendToUser(
      approvedResponderId,
      '🎉 Schimb Aprobat!',
      `Acum lucrezi in ${requesterDateFormatted} in loc de ${targetDateFormatted}`,
      { url: '/my-schedule' },
    );

    // Email catre userul aprobat
    if (approvedResponder) {
      await this.emailService.sendShiftSwapNotification({
        recipientEmail: approvedResponder.email,
        recipientName: approvedResponder.fullName,
        requesterName: requester?.fullName || 'Solicitant',
        requesterDate: requesterDateFormatted,
        targetDate: targetDateFormatted,
        swapType: 'approved',
      });
    }

    // Notifica toti managerii
    const managers = await this.userRepository.find({
      where: { role: UserRole.MANAGER, isActive: true },
    });

    for (const manager of managers) {
      await this.notificationsService.create({
        userId: manager.id,
        type: 'SHIFT_SWAP_APPROVED' as any,
        title: 'Schimb de tura aprobat',
        message: `Schimb aprobat: ${requester?.fullName || 'User'} (${requesterDateFormatted}) ↔ ${approvedResponder?.fullName || 'User'} (${targetDateFormatted})`,
        data: { swapRequestId: request.id },
      });
    }
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('ro-RO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }
}
