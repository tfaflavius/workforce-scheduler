import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, LessThanOrEqual, MoreThan } from 'typeorm';
import { DomiciliuRequest } from './entities/domiciliu-request.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import {
  MAINTENANCE_DEPARTMENT_NAME,
  DOMICILIU_PARKING_DEPARTMENT_NAME,
  DOMICILIU_REQUEST_TYPE_LABELS,
} from './constants/parking.constants';

/**
 * DomiciliuDeadlineScheduler
 * Ruleaza la fiecare ora si verifica solicitarile domiciliu care:
 *  - Au deadline setat
 *  - Mai sunt active (status = ACTIVE)
 *  - Deadline-ul vine in mai putin de 24h
 *  - Nu s-a trimis deja notificarea (deadlineNotifiedAt este NULL)
 *
 * Trimite push + in-app catre toti userii din Intretinere Parcari si
 * Parcari Domiciliu, ca sa stie sa finalizeze solicitarea pana la deadline.
 */
@Injectable()
export class DomiciliuDeadlineScheduler {
  private readonly logger = new Logger(DomiciliuDeadlineScheduler.name);

  constructor(
    @InjectRepository(DomiciliuRequest)
    private readonly domiciliuRequestRepository: Repository<DomiciliuRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Ruleaza la fiecare 30 minute (timezone Romania) — granularitate buna
  // pentru deadline-uri arbitrare fara a stresa serverul.
  @Cron('*/30 * * * *', { timeZone: 'Europe/Bucharest' })
  async handleDeadlineCheck(): Promise<void> {
    try {
      const now = new Date();
      const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000); // now + 24h

      const requests = await this.domiciliuRequestRepository.find({
        where: {
          status: 'ACTIVE',
          deadline: Not(IsNull()) as any,
          deadlineNotifiedAt: IsNull() as any,
        },
      });

      // Filtreaza cele cu deadline in intervalul [now, now+24h]
      const upcoming = requests.filter(r => {
        if (!r.deadline) return false;
        const deadlineMs = new Date(r.deadline).getTime();
        return deadlineMs > now.getTime() && deadlineMs <= cutoff.getTime();
      });

      if (upcoming.length === 0) {
        return;
      }

      this.logger.log(`Domiciliu deadline check: ${upcoming.length} solicitari cu deadline < 24h`);

      // Gaseste useri din Intretinere Parcari + Parcari Domiciliu (o singura interogare)
      const targetDepts = await this.departmentRepository.find({
        where: [
          { name: MAINTENANCE_DEPARTMENT_NAME },
          { name: DOMICILIU_PARKING_DEPARTMENT_NAME },
        ],
      });
      if (targetDepts.length === 0) return;

      const targetDeptIds = targetDepts.map(d => d.id);
      const targetUsers = await this.userRepository.find({
        where: targetDeptIds.map(id => ({ departmentId: id, isActive: true })),
      });

      if (targetUsers.length === 0) {
        this.logger.warn('No active users in Maintenance/Domiciliu departments — deadline notifications skipped');
        return;
      }

      // Trimite cate o serie de notificari pentru fiecare solicitare
      for (const request of upcoming) {
        const requestTypeLabel = DOMICILIU_REQUEST_TYPE_LABELS[request.requestType];
        const deadlineFormatted = new Date(request.deadline).toLocaleString('ro-RO', {
          timeZone: 'Europe/Bucharest',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const title = `Deadline aproape: ${requestTypeLabel}`;
        const message = `Solicitarea "${requestTypeLabel}" la ${request.location} are deadline ${deadlineFormatted} si nu este inca finalizata. Te rugam sa o finalizezi cat mai curand.`;

        const notifications = targetUsers.map(u => ({
          userId: u.id,
          type: NotificationType.DOMICILIU_REQUEST_DEADLINE_APPROACHING,
          title,
          message,
          data: {
            domiciliuRequestId: request.id,
            requestType: request.requestType,
            location: request.location,
            priority: request.priority,
            deadline: request.deadline,
          },
        }));

        try {
          await this.notificationsService.createMany(notifications);
          // Marcheaza ca s-a trimis notificarea ca sa nu se mai trimita iar la urmatoarea rulare
          request.deadlineNotifiedAt = new Date();
          await this.domiciliuRequestRepository.save(request);
        } catch (err: any) {
          this.logger.error(`Failed to send deadline notifications for request ${request.id}: ${err?.message}`);
        }
      }

      this.logger.log(`Domiciliu deadline check: notificat pentru ${upcoming.length} solicitari, ${targetUsers.length} useri tinta`);
    } catch (error: any) {
      this.logger.error(`Domiciliu deadline scheduler error: ${error?.message}`, error?.stack);
    }
  }
}
