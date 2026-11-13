import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Departamentele gestionate de un manager. NULL = toate departamentele, deci managerii
 * existenti nu sunt afectati pana cand adminul nu le aloca departamente.
 */
export class AddManagerDepartments1772000000000 implements MigrationInterface {
  name = 'AddManagerDepartments1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "manager_department_ids" jsonb DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "manager_department_ids"`);
  }
}
