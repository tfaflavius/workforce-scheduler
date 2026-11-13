import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Preferinte de sarbatori pentru Dispecerat (Craciun / Revelion / Paste):
 * perioade generate automat pe an + preferinta fiecarui dispecer pe zi
 * (Concediu / Zi / Noapte / Orice).
 */
export class CreateHolidayPreferences1771700000000 implements MigrationInterface {
  name = 'CreateHolidayPreferences1771700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "holiday_periods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" varchar(20) NOT NULL,
        "year" int NOT NULL,
        "name" varchar(100) NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "status" varchar(10) NOT NULL DEFAULT 'OPEN',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_holiday_periods" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_holiday_period_key_year"
      ON "holiday_periods" ("key", "year")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "holiday_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "period_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "date" date NOT NULL,
        "choice" varchar(10) NOT NULL,
        "note" varchar(300),
        "updated_by" uuid,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_holiday_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "FK_holiday_pref_period" FOREIGN KEY ("period_id")
          REFERENCES "holiday_periods"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_holiday_pref_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_holiday_pref_period_user_date"
      ON "holiday_preferences" ("period_id", "user_id", "date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "holiday_preferences"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "holiday_periods"`);
  }
}
