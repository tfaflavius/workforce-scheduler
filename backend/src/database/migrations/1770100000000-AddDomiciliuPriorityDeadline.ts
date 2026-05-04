import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDomiciliuPriorityDeadline1770100000000 implements MigrationInterface {
  name = 'AddDomiciliuPriorityDeadline1770100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to domiciliu_requests for priority + deadline tracking.
    // Uses IF NOT EXISTS so the migration is safe to re-run on databases where
    // synchronize:true already created the columns.
    await queryRunner.query(`
      ALTER TABLE "domiciliu_requests"
      ADD COLUMN IF NOT EXISTS "priority" varchar(10) NOT NULL DEFAULT 'MEDIU'
    `);
    await queryRunner.query(`
      ALTER TABLE "domiciliu_requests"
      ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "domiciliu_requests"
      ADD COLUMN IF NOT EXISTS "deadline_notified_at" TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "domiciliu_requests" DROP COLUMN IF EXISTS "deadline_notified_at"`);
    await queryRunner.query(`ALTER TABLE "domiciliu_requests" DROP COLUMN IF EXISTS "deadline"`);
    await queryRunner.query(`ALTER TABLE "domiciliu_requests" DROP COLUMN IF EXISTS "priority"`);
  }
}
