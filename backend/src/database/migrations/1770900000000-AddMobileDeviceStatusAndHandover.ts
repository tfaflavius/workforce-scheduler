import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMobileDeviceStatusAndHandover1770900000000 implements MigrationInterface {
  name = 'AddMobileDeviceStatusAndHandover1770900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mobile_devices"
      ADD COLUMN IF NOT EXISTS "status" varchar(50) NOT NULL DEFAULT 'Functional'
    `);
    await queryRunner.query(`
      ALTER TABLE "mobile_devices"
      ADD COLUMN IF NOT EXISTS "handover_date" date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "mobile_devices" DROP COLUMN IF EXISTS "handover_date"`);
    await queryRunner.query(`ALTER TABLE "mobile_devices" DROP COLUMN IF EXISTS "status"`);
  }
}
