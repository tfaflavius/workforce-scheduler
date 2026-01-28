import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectionReasonToSchedules1704000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_schedules
      ADD COLUMN rejection_reason TEXT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_schedules
      DROP COLUMN rejection_reason
    `);
  }
}
