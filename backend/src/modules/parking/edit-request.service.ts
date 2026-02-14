import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EditRequest, EditRequestStatus, EditRequestType } from './entities/edit-request.entity';
import { ParkingIssue } from './entities/parking-issue.entity';
import { ParkingDamage } from './entities/parking-damage.entity';
import { CashCollection } from './entities/cash-collection.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { EmailService } from '../../common/email/email.service';
import { CreateEditRequestDto } from './dto/create-edit-request.dto';
import { ReviewEditRequestDto } from './dto/review-edit-request.dto';

@Injectable()
export class EditRequestService {
  private readonly logger = new Logger(EditRequestService.name);

  constructor(
    @InjectRepository(EditRequest)
    private readonly editRequestRepository: Repository<EditRequest>,
    @InjectRepository(ParkingIssue)
    private readonly parkingIssueRepository: Repository<ParkingIssue>,
    @InjectRepository(ParkingDamage)
    private readonly parkingDamageRepository: Repository<ParkingDamage>,
    @InjectRepository(CashCollection)
    private readonly cashCollectionRepository: Repository<CashCollection>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, dto: CreateEditRequestDto): Promise<EditRequest> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilizator negasit');
    }

    // Adminii pot edita direct, nu au nevoie de aprobare
    if (user.role === UserRole.ADMIN) {
      return this.applyChangesDirectly(userId, dto);
    }

    // Managerii trebuie sa ceara aprobare
    if (user.role !== UserRole.MANAGER) {
      throw new ForbiddenException('Doar managerii pot crea cereri de editare');
    }

    // Obtine datele originale
    const originalData = await this.getOriginalData(dto.requestType, dto.entityId);

    // Calculeaza modificarile propuse cu valori vechi si noi
    const proposedChanges: Record<string, { from: any; to: any }> = {};
    for (const [key, newValue] of Object.entries(dto.proposedChanges)) {
      proposedChanges[key] = {
        from: originalData[key],
        to: newValue,
      };
    }

    const editRequest = this.editRequestRepository.create({
      requestType: dto.requestType,
      entityId: dto.entityId,
      proposedChanges,
      originalData,
      reason: dto.reason,
      requestedBy: userId,
      status: 'PENDING',
    });

    const saved = await this.editRequestRepository.save(editRequest);

    // Notifica adminii - in background
    this.notifyAdmins(saved, user).catch(err => {
      this.logger.error(`Failed to notify admins: ${err.message}`);
    });

    this.logger.log(`Edit request created by ${user.fullName} for ${dto.requestType} ${dto.entityId}`);

    return this.findOne(saved.id);
  }

  async findAll(status?: EditRequestStatus): Promise<EditRequest[]> {
    const where = status ? { status } : {};
    return this.editRequestRepository.find({
      where,
      relations: ['requester', 'reviewer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPending(): Promise<EditRequest[]> {
    return this.findAll('PENDING');
  }

  async findOne(id: string): Promise<EditRequest> {
    const editRequest = await this.editRequestRepository.findOne({
      where: { id },
      relations: ['requester', 'reviewer'],
    });

    if (!editRequest) {
      throw new NotFoundException('Cerere de editare negasita');
    }

    return editRequest;
  }

  async review(id: string, reviewerId: string, dto: ReviewEditRequestDto): Promise<EditRequest> {
    const reviewer = await this.userRepository.findOne({ where: { id: reviewerId } });
    if (!reviewer || reviewer.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Doar adminii pot aproba/respinge cereri de editare');
    }

    const editRequest = await this.findOne(id);

    if (editRequest.status !== 'PENDING') {
      throw new BadRequestException('Aceasta cerere a fost deja procesata');
    }

    if (dto.approved) {
      // Aplica modificarile
      await this.applyChanges(editRequest);
      editRequest.status = 'APPROVED';
    } else {
      if (!dto.rejectionReason) {
        throw new BadRequestException('Motivul respingerii este obligatoriu');
      }
      editRequest.status = 'REJECTED';
      editRequest.rejectionReason = dto.rejectionReason;
    }

    editRequest.reviewedBy = reviewerId;
    editRequest.reviewedAt = new Date();

    const saved = await this.editRequestRepository.save(editRequest);

    // Notifica solicitantul - in background
    this.notifyRequester(saved, reviewer).catch(err => {
      this.logger.error(`Failed to notify requester: ${err.message}`);
    });

    this.logger.log(`Edit request ${id} ${dto.approved ? 'approved' : 'rejected'} by ${reviewer.fullName}`);

    return this.findOne(saved.id);
  }

  async getMyRequests(userId: string): Promise<EditRequest[]> {
    return this.editRequestRepository.find({
      where: { requestedBy: userId },
      relations: ['reviewer'],
      order: { createdAt: 'DESC' },
    });
  }

  // Helper methods

  private async getOriginalData(type: EditRequestType, entityId: string): Promise<Record<string, any>> {
    switch (type) {
      case 'PARKING_ISSUE':
        const issue = await this.parkingIssueRepository.findOne({
          where: { id: entityId },
          relations: ['parkingLot'],
        });
        if (!issue) throw new NotFoundException('Problema negasita');
        return {
          equipment: issue.equipment,
          contactedCompany: issue.contactedCompany,
          description: issue.description,
          parkingLotId: issue.parkingLotId,
          parkingLotName: issue.parkingLot?.name,
        };

      case 'PARKING_DAMAGE':
        const damage = await this.parkingDamageRepository.findOne({
          where: { id: entityId },
          relations: ['parkingLot'],
        });
        if (!damage) throw new NotFoundException('Prejudiciu negasit');
        return {
          damagedEquipment: damage.damagedEquipment,
          personName: damage.personName,
          phone: damage.phone,
          carPlate: damage.carPlate,
          description: damage.description,
          parkingLotId: damage.parkingLotId,
          parkingLotName: damage.parkingLot?.name,
        };

      case 'CASH_COLLECTION':
        const collection = await this.cashCollectionRepository.findOne({
          where: { id: entityId },
          relations: ['parkingLot', 'paymentMachine'],
        });
        if (!collection) throw new NotFoundException('Incasare negasita');
        return {
          paymentMachineId: collection.paymentMachineId,
          paymentMachineName: collection.paymentMachine?.machineNumber,
          amount: collection.amount,
          collectedAt: collection.collectedAt,
          parkingLotId: collection.parkingLotId,
          parkingLotName: collection.parkingLot?.name,
          notes: collection.notes,
        };

      default:
        throw new BadRequestException('Tip de cerere invalid');
    }
  }

  private async applyChanges(editRequest: EditRequest): Promise<void> {
    const changes: Record<string, any> = {};

    // Exclude campurile virtuale care nu sunt coloane in baza de date
    const excludedFields = ['parkingLotName', 'paymentMachineName'];

    for (const [key, value] of Object.entries(editRequest.proposedChanges)) {
      if (!excludedFields.includes(key)) {
        changes[key] = value.to;
      }
    }

    switch (editRequest.requestType) {
      case 'PARKING_ISSUE':
        await this.parkingIssueRepository.update(editRequest.entityId, changes);
        break;

      case 'PARKING_DAMAGE':
        await this.parkingDamageRepository.update(editRequest.entityId, changes);
        break;

      case 'CASH_COLLECTION':
        await this.cashCollectionRepository.update(editRequest.entityId, changes);
        break;
    }
  }

  private async applyChangesDirectly(userId: string, dto: CreateEditRequestDto): Promise<EditRequest> {
    // Admin poate edita direct fara aprobare
    const originalData = await this.getOriginalData(dto.requestType, dto.entityId);

    const proposedChanges: Record<string, { from: any; to: any }> = {};
    for (const [key, newValue] of Object.entries(dto.proposedChanges)) {
      proposedChanges[key] = {
        from: originalData[key],
        to: newValue,
      };
    }

    // Cream cererea ca si cum ar fi fost aprobata instant
    const editRequest = this.editRequestRepository.create({
      requestType: dto.requestType,
      entityId: dto.entityId,
      proposedChanges,
      originalData,
      reason: dto.reason,
      requestedBy: userId,
      reviewedBy: userId,
      reviewedAt: new Date(),
      status: 'APPROVED',
    });

    // Aplicam modificarile
    // Exclude campurile virtuale care nu sunt coloane in baza de date
    const excludedFields = ['parkingLotName', 'paymentMachineName'];

    const changes: Record<string, any> = {};
    for (const [key, value] of Object.entries(proposedChanges)) {
      if (!excludedFields.includes(key)) {
        changes[key] = value.to;
      }
    }

    try {
      this.logger.log(`Applying changes for ${dto.requestType} ${dto.entityId}: ${JSON.stringify(changes)}`);

      switch (dto.requestType) {
        case 'PARKING_ISSUE':
          await this.parkingIssueRepository.update(dto.entityId, changes);
          break;
        case 'PARKING_DAMAGE':
          await this.parkingDamageRepository.update(dto.entityId, changes);
          break;
        case 'CASH_COLLECTION':
          await this.cashCollectionRepository.update(dto.entityId, changes);
          break;
      }

      this.logger.log(`Changes applied successfully for ${dto.requestType} ${dto.entityId}`);
    } catch (error) {
      this.logger.error(`Failed to apply changes: ${error.message}`, error.stack);
      throw error;
    }

    const saved = await this.editRequestRepository.save(editRequest);
    this.logger.log(`Edit request saved with id: ${saved.id}`);

    // Notifica managerii si adminii - in background pentru a nu bloca raspunsul
    this.notifyManagersAndAdmins(saved, userId).catch(err => {
      this.logger.error(`Failed to notify managers and admins: ${err.message}`);
    });

    return this.findOne(saved.id);
  }

  private async notifyAdmins(editRequest: EditRequest, requester: User): Promise<void> {
    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
    });

    const entityDescription = await this.getEntityDescription(editRequest.requestType, editRequest.entityId);

    // Notificari in-app
    for (const admin of admins) {
      await this.notificationsService.create({
        userId: admin.id,
        type: NotificationType.EDIT_REQUEST_CREATED,
        title: 'Cerere de editare noua',
        message: `${requester.fullName} solicita aprobare pentru editarea: ${entityDescription}`,
        data: {
          editRequestId: editRequest.id,
          requestType: editRequest.requestType,
          entityId: editRequest.entityId,
        },
      });

      // Email
      await this.emailService.sendEditRequestNotification({
        recipientEmail: admin.email,
        recipientName: admin.fullName,
        requesterName: requester.fullName,
        requestType: editRequest.requestType,
        entityDescription,
        proposedChanges: editRequest.proposedChanges,
        reason: editRequest.reason,
        status: 'new_request',
      });
    }
  }

  private async notifyRequester(editRequest: EditRequest, reviewer: User): Promise<void> {
    const requester = await this.userRepository.findOne({ where: { id: editRequest.requestedBy } });
    if (!requester) return;

    const entityDescription = await this.getEntityDescription(editRequest.requestType, editRequest.entityId);

    // Notificare in-app
    await this.notificationsService.create({
      userId: requester.id,
      type: editRequest.status === 'APPROVED'
        ? NotificationType.EDIT_REQUEST_APPROVED
        : NotificationType.EDIT_REQUEST_REJECTED,
      title: editRequest.status === 'APPROVED' ? 'Cerere aprobata' : 'Cerere respinsa',
      message: editRequest.status === 'APPROVED'
        ? `Cererea ta de editare pentru ${entityDescription} a fost aprobata de ${reviewer.fullName}.`
        : `Cererea ta de editare pentru ${entityDescription} a fost respinsa. Motiv: ${editRequest.rejectionReason}`,
      data: {
        editRequestId: editRequest.id,
        requestType: editRequest.requestType,
        entityId: editRequest.entityId,
      },
    });

    // Email
    await this.emailService.sendEditRequestNotification({
      recipientEmail: requester.email,
      recipientName: requester.fullName,
      requesterName: requester.fullName,
      requestType: editRequest.requestType,
      entityDescription,
      proposedChanges: editRequest.proposedChanges,
      reason: editRequest.reason,
      status: editRequest.status === 'APPROVED' ? 'approved' : 'rejected',
      rejectionReason: editRequest.rejectionReason,
    });
  }

  private async notifyManagersAndAdmins(editRequest: EditRequest, editorId: string): Promise<void> {
    const editor = await this.userRepository.findOne({ where: { id: editorId } });
    if (!editor) return;

    const recipients = await this.userRepository.find({
      where: [
        { role: UserRole.ADMIN, isActive: true },
        { role: UserRole.MANAGER, isActive: true },
      ],
    });

    const uniqueRecipients = recipients.filter(
      (r, index, self) => index === self.findIndex(u => u.id === r.id) && r.id !== editorId
    );

    const entityDescription = await this.getEntityDescription(editRequest.requestType, editRequest.entityId);

    for (const recipient of uniqueRecipients) {
      // Notificare in-app
      await this.notificationsService.create({
        userId: recipient.id,
        type: NotificationType.EDIT_REQUEST_APPROVED,
        title: 'Element editat',
        message: `${editor.fullName} a editat: ${entityDescription}`,
        data: {
          editRequestId: editRequest.id,
          requestType: editRequest.requestType,
          entityId: editRequest.entityId,
        },
      });

      // Email
      await this.emailService.sendEditRequestNotification({
        recipientEmail: recipient.email,
        recipientName: recipient.fullName,
        requesterName: editor.fullName,
        requestType: editRequest.requestType,
        entityDescription,
        proposedChanges: editRequest.proposedChanges,
        reason: editRequest.reason,
        status: 'approved',
      });
    }
  }

  private async getEntityDescription(type: EditRequestType, entityId: string): Promise<string> {
    switch (type) {
      case 'PARKING_ISSUE':
        const issue = await this.parkingIssueRepository.findOne({
          where: { id: entityId },
          relations: ['parkingLot'],
        });
        return issue ? `Problema: ${issue.equipment} - ${issue.parkingLot?.name}` : 'Problema';

      case 'PARKING_DAMAGE':
        const damage = await this.parkingDamageRepository.findOne({
          where: { id: entityId },
          relations: ['parkingLot'],
        });
        return damage ? `Prejudiciu: ${damage.damagedEquipment} - ${damage.parkingLot?.name}` : 'Prejudiciu';

      case 'CASH_COLLECTION':
        const collection = await this.cashCollectionRepository.findOne({
          where: { id: entityId },
          relations: ['parkingLot'],
        });
        return collection ? `Incasare: ${collection.amount} RON - ${collection.parkingLot?.name}` : 'Incasare';

      default:
        return 'Element';
    }
  }
}
