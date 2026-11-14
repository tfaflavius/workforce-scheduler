import { MigrationInterface, QueryRunner } from 'typeorm';

function tokens(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);
}

/**
 * - Dobre Gabriel (Dispecerat) NU are program fix automat: managerul ii face programul.
 *   Ii scoatem setarea si zilele completate automat (doar cele "Program auto"), plus
 *   notificarea automata de program, daca a primit-o.
 * - Gal Iulian primeste program fix automat 07:30-15:30.
 */
export class AutoScheduleDobreOffGalOn1772400000000 implements MigrationInterface {
  name = 'AutoScheduleDobreOffGalOn1772400000000';

  private async find(queryRunner: QueryRunner, name: string) {
    const users: Array<{ id: string; full_name: string; auto_schedule_start: string | null }> =
      await queryRunner.query(
        `SELECT id, full_name, auto_schedule_start FROM "users" WHERE is_active = true`,
      );
    const need = tokens(name);
    const matches = users.filter((u) => {
      const t = new Set(tokens(u.full_name || ''));
      return need.every((n) => t.has(n));
    });
    if (matches.length !== 1) {
      console.warn(
        `[AutoSchedule] "${name}": ${matches.length} potriviri — setati din Utilizatori`,
      );
      return null;
    }
    return matches[0];
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dobre = await this.find(queryRunner, 'Dobre Gabriel');
    if (dobre) {
      await queryRunner.query(`UPDATE "users" SET "auto_schedule_start" = NULL WHERE "id" = $1`, [
        dobre.id,
      ]);
      await queryRunner.query(
        `DELETE FROM "schedule_assignments" WHERE "user_id" = $1 AND "notes" LIKE 'Program auto%'`,
        [dobre.id],
      );
      await queryRunner.query(
        `DELETE FROM "notifications" WHERE "user_id" = $1 AND "data"->>'autoScheduleMonth' IS NOT NULL`,
        [dobre.id],
      );
    }

    const gal = await this.find(queryRunner, 'Gal Iulian');
    if (gal && !gal.auto_schedule_start) {
      await queryRunner.query(
        `UPDATE "users" SET "auto_schedule_start" = '07:30' WHERE "id" = $1`,
        [gal.id],
      );
    }
  }

  public async down(): Promise<void> {
    // nimic: setarile se pot schimba din Utilizatori
  }
}
