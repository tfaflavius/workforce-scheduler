import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectedStatus1704000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old constraint
    await queryRunner.query(`
      ALTER TABLE work_schedules
      DROP CONSTRAINT work_schedules_status_check
    `);

    // Add new constraint with REJECTED status
    await queryRunner.query(`
      ALTER TABLE work_schedules
      ADD CONSTRAINT work_schedules_status_check
      CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'ARCHIVED', 'REJECTED'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the new constraint
    await queryRunner.query(`
      ALTER TABLE work_schedules
      DROP CONSTRAINT work_schedules_status_check
    `);

    // Restore old constraint without REJECTED
    await queryRunner.query(`
      ALTER TABLE work_schedules
      ADD CONSTRAINT work_schedules_status_check
      CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'ARCHIVED'))
    `);
  }
}
