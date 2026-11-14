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

/** Dobre Gabriel: program fix automat 14:00-22:00 in fiecare zi lucratoare. */
export class AutoScheduleDobre141772500000000 implements MigrationInterface {
  name = 'AutoScheduleDobre141772500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const users: Array<{ id: string; full_name: string }> = await queryRunner.query(
      `SELECT id, full_name FROM "users" WHERE is_active = true`,
    );
    const need = tokens('Dobre Gabriel');
    const matches = users.filter((u) => {
      const t = new Set(tokens(u.full_name || ''));
      return need.every((n) => t.has(n));
    });
    if (matches.length !== 1) {
      console.warn(
        `[AutoSchedule] "Dobre Gabriel": ${matches.length} potriviri — setati din Utilizatori`,
      );
      return;
    }
    await queryRunner.query(`UPDATE "users" SET "auto_schedule_start" = '14:00' WHERE "id" = $1`, [
      matches[0].id,
    ]);
  }

  public async down(): Promise<void> {
    // nimic: setarea se poate schimba din Utilizatori
  }
}
