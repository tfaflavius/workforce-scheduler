import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adauga campurile "serial" (serie) si "terminal" pe definitiile de stoc echipamente.
 */
export class AddSerialTerminalToStockDefinition1771300000000
  implements MigrationInterface
{
  name = 'AddSerialTerminalToStockDefinition1771300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "equipment_stock_definitions"
      ADD COLUMN IF NOT EXISTS "serial" varchar(150)
    `);
    await queryRunner.query(`
      ALTER TABLE "equipment_stock_definitions"
      ADD COLUMN IF NOT EXISTS "terminal" varchar(150)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "equipment_stock_definitions" DROP COLUMN IF EXISTS "terminal"`);
    await queryRunner.query(`ALTER TABLE "equipment_stock_definitions" DROP COLUMN IF EXISTS "serial"`);
  }
}
