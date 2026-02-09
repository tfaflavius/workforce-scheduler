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
    private readonly emailService: EmailService,
  ) {}

  /**
   * Creează o cerere de schimb de tură
   */
  async createSwapRequest(
    requesterId: string,
    dto: CreateSwapRequestDto,
  ): Promise<ShiftSwapRequest> {
    const requester = await this.userRepository.findOne({ where: { id: requesterId } });
    if (!requester) {
      throw new NotFoundException('Utilizatorul nu a fost găsit');
    }

    // Verifică dacă solicitantul are o tură în data respectivă
    const requesterAssignment = await this.findAssignmentForUserAndDate(
      requesterId,
      dto.requesterDate,
    );
    if (!requesterAssignment) {
      throw new BadRequestException('Nu ai o tură programată în data selectată');
    }

    // Găsește userii care lucrează în data țintă
    const targetUsers = await this.findUsersWorkingOnDate(dto.targetDate, requesterId);
    if (targetUsers.length === 0) {
      throw new BadRequestException('Nu există alți utilizatori care lucrează în data selectată');
    }

    // Verifică dacă nu există deja o cerere activă pentru aceeași dată
    const existingRequest = await this.swapRequestRepository.findOne({
      where: {
        requesterId,
        requesterDate: new Date(dto.requesterDate),
        status: In([ShiftSwapStatus.PENDING, ShiftSwapStatus.AWAITING_ADMIN]),
      },
    });
    if (existingRequest) {
      throw new BadRequestException('Ai deja o cerere activă pentru această dată');
    }

    // Obține tipul de tură
    const targetAssignment = await this.findAnyAssignmentForDate(dto.targetDate);

    // Creează cererea
    const swapRequest = this.swapRequestRepository.create({
      requesterId,
      requesterDate: new Date(dto.requesterDate),
      requesterShiftType: requesterAssignment.notes || 'Tură',
      targetDate: new Date(dto.targetDate),
      targetShiftType: targetAssignment?.notes || 'Tură',
      reason: dto.reason,
      status: ShiftSwapStatus.PENDING,
    });

    const savedRequest = await this.swapRequestRepository.save(swapRequest);

    // Trimite notificări
    await this.sendSwapRequestNotifications(savedRequest, requester, targetUsers);

    this.logger.log(`Swap request created: ${savedRequest.id} by user ${requesterId}`);

    return this.findOne(savedRequest.id);
  }

  /**
   * Răspunde la o cerere de schimb
   */
  async respondToSwapRequest(
    swapRequestId: string,
    responderId: string,
    dto: RespondSwapDto,
  ): Promise<ShiftSwapResponse> {
    const swapRequest = await this.findOne(swapRequestId);

    // Verifică statusul
    if (swapRequest.status !== ShiftSwapStatus.PENDING) {
      throw new BadRequestException('Această cerere nu mai acceptă răspunsuri');
    }

    // Verifică dacă userul lucrează în data țintă
    const responderAssignment = await this.findAssignmentForUserAndDate(
      responderId,
      swapRequest.targetDate.toISOString().split('T')[0],
    );
    if (!responderAssignment) {
      throw new ForbiddenException('Nu poți răspunde la această cerere - nu lucrezi în data respectivă');
    }

    // Verifică dacă nu a răspuns deja
    const existingResponse = await this.swapResponseRepository.findOne({
      where: { swapRequestId, responderId },
    });
    if (existingResponse) {
      throw new BadRequestException('Ai răspuns deja la această cerere');
    }

    // Creează răspunsul
    const response = this.swapResponseRepository.create({
      swapRequestId,
      responderId,
      response: dto.response,
      message: dto.message,
    });

    const savedResponse = await this.swapResponseRepository.save(response);

    // Trimite notificări
    const responder = await this.userRepository.findOne({ where: { id: responderId } });
    await this.sendSwapResponseNotifications(swapRequest, responder, dto.response);

    // Verifică dacă cineva a acceptat - actualizează statusul
    if (dto.response === SwapResponseType.ACCEPTED) {
      await this.swapRequestRepository.update(swapRequestId, {
        status: ShiftSwapStatus.AWAITING_ADMIN,
      });
    }

    this.logger.log(`Swap response: ${dto.response} for request ${swapRequestId} by user ${responderId}`);

    return savedResponse;
  }

  /**
   * Admin aprobă schimbul
   */
  async adminApproveSwap(
    swapRequestId: string,
    adminId: string,
    dto: AdminApproveSwapDto,
  ): Promise<ShiftSwapRequest> {
    const swapRequest = await this.findOne(swapRequestId);

    // Verifică statusul
    if (swapRequest.status !== ShiftSwapStatus.AWAITING_ADMIN) {
      throw new BadRequestException('Această cerere nu poate fi aprobată în acest moment');
    }

    // Verifică dacă userul ales a acceptat
    const acceptedResponse = swapRequest.responses?.find(
      (r) => r.responderId === dto.approvedResponderId && r.response === SwapResponseType.ACCEPTED,
    );
    if (!acceptedResponse) {
      throw new BadRequestException('Utilizatorul selectat nu a acceptat schimbul');
    }

    // Efectuează schimbul în program
    await this.executeSwap(swapRequest, dto.approvedResponderId);

    // Actualizează cererea
    await this.swapRequestRepository.update(swapRequestId, {
      status: ShiftSwapStatus.APPROVED,
      approvedResponderId: dto.approvedResponderId,
      adminId,
      adminNotes: dto.adminNotes,
    });

    // Trimite notificări finale
    await this.sendSwapApprovedNotifications(swapRequest, dto.approvedResponderId);

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
      throw new BadRequestException('Această cerere nu poate fi respinsă');
    }

    await this.swapRequestRepository.update(swapRequestId, {
      status: ShiftSwapStatus.REJECTED,
      adminId,
      adminNotes: dto.adminNotes,
    });

    const requesterDateFormatted = this.formatDate(swapRequest.requesterDate);
    const targetDateFormatted = this.formatDate(swapRequest.targetDate);
    const requester = await this.userRepository.findOne({ where: { id: swapRequest.requesterId } });

    // Notifică solicitantul
    await this.notificationsService.create({
      userId: swapRequest.requesterId,
      type: 'SHIFT_SWAP_REJECTED' as any,
      title: 'Cerere de schimb respinsă',
      message: `Cererea ta de schimb pentru ${requesterDateFormatted} a fost respinsă de administrator.${dto.adminNotes ? ` Motiv: ${dto.adminNotes}` : ''}`,
      data: { swapRequestId },
    });

    // Email către solicitant
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

    this.logger.log(`Swap rejected: ${swapRequestId} by admin ${adminId}`);

    return this.findOne(swapRequestId);
  }

  /**
   * Anulează o cerere (doar solicitantul)
   */
  async cancelSwapRequest(
    swapRequestId: string,
    userId: string,
  ): Promise<ShiftSwapRequest> {
    const swapRequest = await this.findOne(swapRequestId);

    if (swapRequest.requesterId !== userId) {
      throw new ForbiddenException('Nu poți anula această cerere');
    }

    if (![ShiftSwapStatus.PENDING, ShiftSwapStatus.AWAITING_ADMIN].includes(swapRequest.status)) {
      throw new BadRequestException('Această cerere nu poate fi anulată');
    }

    await this.swapRequestRepository.update(swapRequestId, {
      status: ShiftSwapStatus.CANCELLED,
    });

    this.logger.log(`Swap cancelled: ${swapRequestId} by user ${userId}`);

    return this.findOne(swapRequestId);
  }

  /**
   * Găsește o cerere după ID
   */
  async findOne(id: string): Promise<ShiftSwapRequest> {
    const request = await this.swapRequestRepository.findOne({
      where: { id },
      relations: ['requester', 'approvedResponder', 'admin', 'responses', 'responses.responder'],
    });

    if (!request) {
      throw new NotFoundException('Cererea nu a fost găsită');
    }

    return request;
  }

  /**
   * Lista cererilor pentru un user
   */
  async findUserSwapRequests(userId: string): Promise<ShiftSwapRequest[]> {
    // Cererile făcute de user sau în care userul poate răspunde
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
   * Găsește userii care lucrează într-o anumită dată
   */
  async findUsersWorkingOnDate(date: string, excludeUserId?: string): Promise<User[]> {
    const assignments = await this.assignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.user', 'user')
      .where('assignment.shiftDate = :date', { date })
      .andWhere('user.isActive = true')
      .getMany();

    let users = assignments
      .map((a) => a.user)
      .filter((u) => u && u.id !== excludeUserId);

    // Elimină duplicatele
    const uniqueUsers = users.filter(
      (user, index, self) => index === self.findIndex((u) => u.id === user.id),
    );

    return uniqueUsers;
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
      relations: ['shiftType'],
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
   * Efectuează schimbul în program
   */
  private async executeSwap(
    swapRequest: ShiftSwapRequest,
    approvedResponderId: string,
  ): Promise<void> {
    const requesterDateStr = swapRequest.requesterDate.toISOString().split('T')[0];
    const targetDateStr = swapRequest.targetDate.toISOString().split('T')[0];

    // Găsește assignment-urile
    const requesterAssignment = await this.findAssignmentForUserAndDate(
      swapRequest.requesterId,
      requesterDateStr,
    );
    const responderAssignment = await this.findAssignmentForUserAndDate(
      approvedResponderId,
      targetDateStr,
    );

    if (!requesterAssignment || !responderAssignment) {
      throw new BadRequestException('Nu s-au găsit turele pentru schimb');
    }

    // Schimbă user-ii între assignment-uri
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
   * Trimite notificări la crearea cererii
   */
  private async sendSwapRequestNotifications(
    request: ShiftSwapRequest,
    requester: User,
    targetUsers: User[],
  ): Promise<void> {
    const requesterDateFormatted = this.formatDate(request.requesterDate);
    const targetDateFormatted = this.formatDate(request.targetDate);

    // Notifică admin-ii
    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
    });

    for (const admin of admins) {
      // Notificare in-app
      await this.notificationsService.create({
        userId: admin.id,
        type: 'SHIFT_SWAP_REQUEST' as any,
        title: 'Cerere nouă de schimb de tură',
        message: `${requester.fullName} a solicitat schimb de tură: ${requesterDateFormatted} ↔ ${targetDateFormatted}. Motiv: ${request.reason}`,
        data: { swapRequestId: request.id },
      });

      // Email către admin
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

    // Notifică userii care lucrează în data țintă
    for (const user of targetUsers) {
      // Notificare in-app
      await this.notificationsService.create({
        userId: user.id,
        type: 'SHIFT_SWAP_REQUEST' as any,
        title: 'Cerere de schimb de tură',
        message: `${requester.fullName} dorește să schimbe tura din ${requesterDateFormatted} cu tura ta din ${targetDateFormatted}. Motiv: ${request.reason}`,
        data: { swapRequestId: request.id },
      });

      // Email către user
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
   * Trimite notificări la răspuns
   */
  private async sendSwapResponseNotifications(
    request: ShiftSwapRequest,
    responder: User,
    responseType: SwapResponseType,
  ): Promise<void> {
    const responseText = responseType === SwapResponseType.ACCEPTED ? 'a acceptat' : 'a refuzat';
    const requesterDateFormatted = this.formatDate(request.requesterDate);
    const targetDateFormatted = this.formatDate(request.targetDate);

    // Obține solicitantul pentru email
    const requester = await this.userRepository.findOne({ where: { id: request.requesterId } });

    // Notifică solicitantul
    await this.notificationsService.create({
      userId: request.requesterId,
      type: 'SHIFT_SWAP_RESPONSE' as any,
      title: `Răspuns la cererea de schimb`,
      message: `${responder.fullName} ${responseText} cererea ta de schimb pentru ${requesterDateFormatted}.`,
      data: { swapRequestId: request.id },
    });

    // Email către solicitant
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

    // Notifică admin-ii dacă cineva a acceptat
    if (responseType === SwapResponseType.ACCEPTED) {
      const admins = await this.userRepository.find({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      for (const admin of admins) {
        // Notificare in-app
        await this.notificationsService.create({
          userId: admin.id,
          type: 'SHIFT_SWAP_RESPONSE' as any,
          title: 'Schimb de tură - acceptare',
          message: `${responder.fullName} a acceptat să facă schimb cu ${request.requester?.fullName || 'solicitant'}. Așteaptă aprobarea ta.`,
          data: { swapRequestId: request.id },
        });

        // Email către admin
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
   * Trimite notificări după aprobare
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

    // Notifică solicitantul
    await this.notificationsService.create({
      userId: request.requesterId,
      type: 'SHIFT_SWAP_APPROVED' as any,
      title: 'Schimb de tură aprobat!',
      message: `Schimbul tău a fost aprobat! Acum lucrezi în ${targetDateFormatted} în loc de ${requesterDateFormatted}.`,
      data: { swapRequestId: request.id },
    });

    // Email către solicitant
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

    // Notifică userul aprobat
    await this.notificationsService.create({
      userId: approvedResponderId,
      type: 'SHIFT_SWAP_APPROVED' as any,
      title: 'Schimb de tură aprobat!',
      message: `Schimbul a fost aprobat! Acum lucrezi în ${requesterDateFormatted} în loc de ${targetDateFormatted}.`,
      data: { swapRequestId: request.id },
    });

    // Email către userul aprobat
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

    // Notifică toți managerii
    const managers = await this.userRepository.find({
      where: { role: UserRole.MANAGER, isActive: true },
    });

    for (const manager of managers) {
      await this.notificationsService.create({
        userId: manager.id,
        type: 'SHIFT_SWAP_APPROVED' as any,
        title: 'Schimb de tură aprobat',
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
