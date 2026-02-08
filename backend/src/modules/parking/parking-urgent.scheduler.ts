import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ParkingIssuesService } from './parking-issues.service';
import { ParkingDamagesService } from './parking-damages.service';

@Injectable()
export class ParkingUrgentScheduler {
  private readonly logger = new Logger(ParkingUrgentScheduler.name);

  constructor(
    private readonly parkingIssuesService: ParkingIssuesService,
    private readonly parkingDamagesService: ParkingDamagesService,
  ) {}

  // Rulează la fiecare oră pentru a marca problemele urgente
  @Cron(CronExpression.EVERY_HOUR)
  async handleMarkUrgent() {
    this.logger.log('Verificare probleme și prejudicii nerezolvate de 48h+...');

    try {
      const issuesMarked = await this.parkingIssuesService.markUrgentIssues();
      const damagesMarked = await this.parkingDamagesService.markUrgentDamages();

      if (issuesMarked > 0 || damagesMarked > 0) {
        this.logger.log(`Marcate ca urgente: ${issuesMarked} probleme, ${damagesMarked} prejudicii`);
      }
    } catch (error) {
      this.logger.error('Eroare la marcarea problemelor urgente:', error);
    }
  }

  // Rulează de 2 ori pe zi (la 8:00 și 16:00) pentru notificări urgente
  @Cron('0 8,16 * * *')
  async handleNotifyUrgent() {
    this.logger.log('Trimitere notificări pentru probleme urgente...');

    try {
      await this.parkingIssuesService.notifyUrgentIssues();
      this.logger.log('Notificări urgente trimise cu succes');
    } catch (error) {
      this.logger.error('Eroare la trimiterea notificărilor urgente:', error);
    }
  }
}
