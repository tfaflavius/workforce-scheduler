import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OfficeSchedulePrefillService } from './office-schedule-prefill.service';

/**
 * Programeaza precompletarea automata a programului de birou (07:30-15:30) pentru
 * departamentele: Procese Verbale/Facturare, Achizitii, Parcometre, Parcari Handicap,
 * Parcari Domiciliu.
 *
 * - In ultimele 5 zile ale lunii (zilnic, 00:20) precompleteaza deja luna urmatoare.
 * - La inceputul fiecarei luni (ziua 1, 00:10) precompleteaza luna nou inceputa (ce lipseste).
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

  /** Cate zile mai sunt pana la sfarsitul lunii (inclusiv azi), pe ora Bucurestiului. */
  private daysLeftInMonth(): number {
    const [y, m, d] = new Date()
      .toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' })
      .split('-')
      .map(Number);
    return new Date(y, m, 0).getDate() - d + 1;
  }

  /**
   * In ultimele 5 zile ale lunii precompleteaza deja luna urmatoare, ca oamenii sa-si vada
   * programul din timp. Tine cont de concediile aprobate si de programele puse manual
   * (acestea nu sunt suprascrise). Idempotent: ruleaza zilnic, completeaza doar ce lipseste.
   */
  async prefillNextMonthIfDue(): Promise<void> {
    if (this.daysLeftInMonth() > 5) return;
    const { year, month } = this.prefillService.getCurrentBucharestYearMonth();
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const res = await this.prefillService.prefillMonth(nextYear, nextMonth);
    if (res.created > 0) {
      this.logger.log(
        `[Prefill] Luna urmatoare ${nextYear}-${nextMonth}: ${res.created} asignari, ${res.users} angajati`,
      );
    }
    await this.prefillService.notifyPrefilledMonth(nextYear, nextMonth);
  }

  // Zilnic la 00:20 — in ultimele 5 zile ale lunii pregateste luna urmatoare
  @Cron('20 0 * * *', { timeZone: 'Europe/Bucharest' })
  async handleDailyNextMonth() {
    try {
      await this.prefillNextMonthIfDue();
    } catch (error) {
      this.logger.error(`[Prefill] Eroare luna urmatoare: ${error.message}`);
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
      // Daca suntem in ultimele 5 zile ale lunii, pregateste si luna urmatoare
      await this.prefillNextMonthIfDue();
    } catch (error) {
      this.logger.error(`[Prefill birou] Eroare la pornire: ${error.message}`);
    }
  }
}
