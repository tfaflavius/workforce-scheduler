import { MigrationInterface, QueryRunner } from 'typeorm';

/** Angajatii cu program fix automat cerut individual (nume -> ora de inceput). */
const AUTO_USERS: Array<{ name: string; start: string }> = [
  { name: 'Bocsan Dorin', start: '07:30' },
  { name: 'Lazar Ovidiu', start: '07:30' },
  { name: 'Puscas Bogdan', start: '07:30' },
  { name: 'Duma Gheorghe', start: '07:30' },
  { name: 'Octavian Farcuta', start: '07:30' },
  { name: 'Mircea Borz', start: '07:30' },
  { name: 'Mariana Borz', start: '07:30' },
  { name: 'Mircea Olah', start: '07:30' },
  { name: 'Kelemen Laszlo', start: '08:00' },
];

/** Fara diacritice, litere mici, cuvinte sortate — ca "Borz Mircea" == "Mircea Borz". */
function key(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

/**
 * - users.auto_schedule_start: program fix automat individual (ex. 07:30 / 08:00)
 * - schedule_time_requests: cererile de a veni la alta ora (tot 8 ore)
 * - seteaza programul fix pentru angajatii ceruti, dupa nume (fara diacritice, orice ordine)
 */
export class AutoScheduleUsers1772200000000 implements MigrationInterface {
  name = 'AutoScheduleUsers1772200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auto_schedule_start" varchar(5) DEFAULT NULL`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "schedule_time_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "start_time" varchar(5) NOT NULL,
        "reason" text,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "reviewed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "review_note" text,
        "reviewed_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_schedule_time_requests_user" ON "schedule_time_requests" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_schedule_time_requests_status" ON "schedule_time_requests" ("status")`,
    );

    const users: Array<{ id: string; full_name: string; auto_schedule_start: string | null }> =
      await queryRunner.query(`SELECT id, full_name, auto_schedule_start FROM "users"`);
    const byKey = new Map<string, typeof users>();
    for (const u of users) {
      const k = key(u.full_name || '');
      byKey.set(k, [...(byKey.get(k) || []), u]);
    }
    for (const wanted of AUTO_USERS) {
      const matches = byKey.get(key(wanted.name)) || [];
      if (matches.length !== 1) {
        console.warn(
          `[AutoScheduleUsers] "${wanted.name}": ${matches.length} potriviri — setati programul din Utilizatori`,
        );
        continue;
      }
      if (matches[0].auto_schedule_start) continue; // nu suprascrie o setare existenta
      await queryRunner.query(`UPDATE "users" SET "auto_schedule_start" = $1 WHERE "id" = $2`, [
        wanted.start,
        matches[0].id,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "schedule_time_requests"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "auto_schedule_start"`);
  }
}
