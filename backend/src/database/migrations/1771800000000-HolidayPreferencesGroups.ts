import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sarbatori pe toate departamentele: fiecare departament e un grup separat
 * (Handicap + Domiciliu impreuna). Chat-ul si inchiderea perioadei devin per grup.
 * Datele existente (doar Dispecerat) sunt mutate pe grupul Dispeceratului.
 */
export class HolidayPreferencesGroups1771800000000 implements MigrationInterface {
  name = 'HolidayPreferencesGroups1771800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "holiday_periods"
      ADD COLUMN IF NOT EXISTS "locked_groups" jsonb NOT NULL DEFAULT '[]'
    `);
    await queryRunner.query(`
      ALTER TABLE "holiday_messages"
      ADD COLUMN IF NOT EXISTS "group_key" varchar(60)
    `);

    const disp = await queryRunner.query(
      `SELECT id::text AS id FROM "departments" WHERE name = 'Dispecerat' LIMIT 1`,
    );
    const dispKey: string | undefined = disp?.[0]?.id;
    if (dispKey) {
      await queryRunner.query(
        `UPDATE "holiday_messages" SET "group_key" = $1 WHERE "group_key" IS NULL`,
        [dispKey],
      );
      await queryRunner.query(
        `UPDATE "holiday_periods" SET "locked_groups" = jsonb_build_array($1::text)
         WHERE "status" = 'LOCKED' AND "locked_groups" = '[]'::jsonb`,
        [dispKey],
      );
    }
    await queryRunner.query(`DELETE FROM "holiday_messages" WHERE "group_key" IS NULL`);
    await queryRunner.query(`ALTER TABLE "holiday_messages" ALTER COLUMN "group_key" SET NOT NULL`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_holiday_messages_period_created"`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_holiday_messages_period_group"
      ON "holiday_messages" ("period_id", "group_key", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_holiday_messages_period_group"`);
    await queryRunner.query(`ALTER TABLE "holiday_messages" DROP COLUMN IF EXISTS "group_key"`);
    await queryRunner.query(`ALTER TABLE "holiday_periods" DROP COLUMN IF EXISTS "locked_groups"`);
  }
}
