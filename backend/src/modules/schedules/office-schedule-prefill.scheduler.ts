import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OfficeSchedulePrefillService } from './office-schedule-prefill.service';

/**
 * Programeaza precompletarea automata a programului de birou (07:30-15:30) pentru
 * departamentele: Procese Verbale/Facturare, Achizitii, Parcometre, Parcari Handicap,
 * Parcari Domiciliu.
 *
 * - La inceputul fiecarei luni (ziua 1, 00:10) precompleteaza luna nou inceputa.
 * - La pornirea aplicatiei precompleteaza luna curenta (idempotent), ca sa fie activ imediat.
 */
@Injectable()
export class OfficeSchedulePrefillScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(OfficeSchedulePrefillScheduler.name);

  constructor(private readonly prefillService: OfficeSchedulePrefillService) {}

  // Ziua 1 a fiecarei luni, 00:10 (ora Bucuresti) — precompleteaza luna curenta
  @Cron('10 0 1 * *', { timeZone: 'Europe/Bucharest' })
  async handleMonthlyPrefill() {
    try {
      const { year, month } = this.prefillService.getCurrentBucharestYearMonth();
      const res = await this.prefillService.prefillMonth(year, month);
      this.logger.log(
        `[Prefill birou] Lunar ${year}-${month}: ${res.created} asignari, ${res.users} angajati`,
      );
      await this.prefillService.notifyPrefilledMonth(year, month);
    } catch (error) {
      this.logger.error(`[Prefill birou] Eroare lunar: ${error.message}`);
    }
  }

  // La pornire — asigura ca luna curenta este precompletata (idempotent, best-effort)
  async onApplicationBootstrap() {
    try {
      const { year, month } = this.prefillService.getCurrentBucharestYearMonth();
      const res = await this.prefillService.prefillMonth(year, month);
      if (res.created > 0) {
        this.logger.log(
          `[Prefill birou] La pornire ${year}-${month}: ${res.created} asignari create`,
        );
      }
      // Anunta si pe cei completati recent (o singura data pe luna)
      await this.prefillService.notifyPrefilledMonth(year, month);
    } catch (error) {
      this.logger.error(`[Prefill birou] Eroare la pornire: ${error.message}`);
    }
  }
}
