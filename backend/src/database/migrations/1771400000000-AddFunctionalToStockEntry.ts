import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adauga starea "functional" (true = functional/nou, false = nefunctional/stricat)
 * pe intrarile de stoc echipamente.
 */
export class AddFunctionalToStockEntry1771400000000 implements MigrationInterface {
  name = 'AddFunctionalToStockEntry1771400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "equipment_stock_entries"
      ADD COLUMN IF NOT EXISTS "functional" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "equipment_stock_entries" DROP COLUMN IF EXISTS "functional"`);
  }
}
