import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMobileDevices1770800000000 implements MigrationInterface {
  name = 'CreateMobileDevices1770800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mobile_devices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "device_type" varchar(100) NOT NULL,
        "model" varchar(150) NOT NULL,
        "serial_imei" varchar(150),
        "sim_operator" varchar(100),
        "sim_serial" varchar(150),
        "assigned_user_id" uuid,
        "notes" text,
        "created_by_id" uuid,
        "last_edited_by_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_mobile_devices" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "mobile_devices"
        ADD CONSTRAINT "FK_mobile_devices_assigned_user"
          FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "mobile_devices"
        ADD CONSTRAINT "FK_mobile_devices_created_by"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "mobile_devices"
        ADD CONSTRAINT "FK_mobile_devices_last_edited_by"
          FOREIGN KEY ("last_edited_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mobile_devices_assigned_user"
      ON "mobile_devices" ("assigned_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "mobile_devices"`);
  }
}
