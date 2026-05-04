import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateControlInspectionNotes1770500000000 implements MigrationInterface {
  name = 'CreateControlInspectionNotes1770500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "control_inspection_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "year" int NOT NULL,
        "month" int NOT NULL,
        "count" int NOT NULL,
        "marker" varchar(20),
        "notes" text,
        "created_by_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_control_inspection_notes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_control_notes_user_year_month" UNIQUE ("user_id", "year", "month")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "control_inspection_notes"
        ADD CONSTRAINT "FK_control_notes_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "control_inspection_notes"
        ADD CONSTRAINT "FK_control_notes_created_by"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_control_notes_year_month"
      ON "control_inspection_notes" ("year", "month")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "control_inspection_notes"`);
  }
}
