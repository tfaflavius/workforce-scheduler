import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { EmailService } from '../../common/email/email.service';
import {
  CONTROL_DEPARTMENT_NAME,
  MAINTENANCE_DEPARTMENT_NAME,
} from '../parking/constants/parking.constants';
import { removeDiacritics } from '../../common/utils/remove-diacritics';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  private pontajText(): string {
    return 'La ÎNCEPUTUL turei apasă butonul «Pornește Tura», iar la FINALUL turei «Oprește Tura». Este OBLIGATORIU. Pe baza pontajului, timpul lucrat (orele și ora de început) apare automat în aplicație, la secțiunea „Program lucrat".';
  }

  private amenziText(): string {
    return 'Evidența amenzilor: fiecare agent de Control vede în dashboard câte note de constatare (amenzi) a dat personal (total pe an și pe luna curentă) și cu cât la sută este peste sau sub media combinată a echipei de Control.';
  }

  private buildMessage(isControl: boolean): string {
    return isControl ? `${this.pontajText()}\n\n${this.amenziText()}` : this.pontajText();
  }

  private buildEmailHtml(fullName: string, isControl: boolean): string {
    const amenziBlock = isControl
      ? `<h3 style="color:#0f172a;margin:24px 0 8px;">2. Evidența amenzilor (Control)</h3>
         <p style="color:#334155;line-height:1.6;margin:0;">${this.amenziText()}</p>`
      : '';
    return `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#1d4ed8;margin:0 0 16px;">Anunț important</h2>
        <p style="color:#334155;line-height:1.6;">Bună, ${fullName},</p>
        <h3 style="color:#0f172a;margin:24px 0 8px;">1. Pontaj obligatoriu (pornire / oprire tură)</h3>
        <p style="color:#334155;line-height:1.6;margin:0;">${this.pontajText()}</p>
        ${amenziBlock}
        <p style="color:#64748b;font-size:13px;margin-top:28px;">Acest mesaj a fost trimis automat din aplicația WorkSchedule.</p>
      </div>`;
  }

  /**
   * Trimite (in-app + email) anuntul despre pontajul obligatoriu si evidenta amenzilor
   * tuturor userilor activi de la Control si Intretinere Parcari.
   */
  async sendPontajAmenziAnnouncement(): Promise<{
    total: number;
    notified: number;
    emailed: number;
    failed: number;
  }> {
    const users = await this.userRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.department', 'd')
      .where('u.isActive = true')
      .andWhere('d.name IN (:...names)', {
        names: [CONTROL_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME],
      })
      .getMany();

    const isControlUser = (u: User) =>
      removeDiacritics(u.department?.name || '') === CONTROL_DEPARTMENT_NAME;

    // Notificari in-app (bulk)
    const notifications = users.map((u) => {
      const control = isControlUser(u);
      return {
        userId: u.id,
        type: NotificationType.GENERAL,
        title: control
          ? 'Important: pontaj obligatoriu + evidența amenzilor'
          : 'Important: pontaj obligatoriu (pornire/oprire tură)',
        message: this.buildMessage(control),
        data: { url: '/dashboard' },
      };
    });

    if (notifications.length > 0) {
      await this.notificationsService.createMany(notifications);
    }

    // Emailuri
    let emailed = 0;
    let failed = 0;
    for (const u of users) {
      if (!u.email) continue;
      const control = isControlUser(u);
      try {
        const ok = await this.emailService.sendForcedEmail(
          u.email,
          control
            ? 'Important: pontaj obligatoriu + evidența amenzilor'
            : 'Important: pontaj obligatoriu (pornire/oprire tură)',
          this.buildEmailHtml(u.fullName, control),
        );
        if (ok) emailed++;
        else failed++;
      } catch (err: any) {
        failed++;
        this.logger.error(`Email anunt esuat pentru ${u.email}: ${err?.message}`);
      }
    }

    this.logger.log(
      `Anunt pontaj/amenzi: ${users.length} useri, ${notifications.length} notificari, ${emailed} emailuri (${failed} esuate)`,
    );

    return { total: users.length, notified: notifications.length, emailed, failed };
  }
}
