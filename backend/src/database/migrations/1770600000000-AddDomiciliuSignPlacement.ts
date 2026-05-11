import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDomiciliuSignPlacement1770600000000 implements MigrationInterface {
  name = 'AddDomiciliuSignPlacement1770600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "domiciliu_requests"
      ADD COLUMN IF NOT EXISTS "sign_placement_status" varchar(20) NOT NULL DEFAULT 'NONE'
    `);
    await queryRunner.query(`
      ALTER TABLE "domiciliu_requests"
      ADD COLUMN IF NOT EXISTS "sign_placement_requested_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "domiciliu_requests"
      ADD COLUMN IF NOT EXISTS "sign_placement_requested_by" uuid REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "domiciliu_requests"
      ADD COLUMN IF NOT EXISTS "sign_placement_claimed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "domiciliu_requests"
      ADD COLUMN IF NOT EXISTS "sign_placement_claimed_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "domiciliu_requests"
      ADD COLUMN IF NOT EXISTS "sign_placement_completed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "domiciliu_requests"
      ADD COLUMN IF NOT EXISTS "sign_placement_completed_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "domiciliu_requests"
      ADD COLUMN IF NOT EXISTS "sign_placement_observations" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "domiciliu_requests" DROP COLUMN IF EXISTS "sign_placement_observations"`);
    await queryRunner.query(`ALTER TABLE "domiciliu_requests" DROP COLUMN IF EXISTS "sign_placement_completed_at"`);
    await queryRunner.query(`ALTER TABLE "domiciliu_requests" DROP COLUMN IF EXISTS "sign_placement_completed_by"`);
    await queryRunner.query(`ALTER TABLE "domiciliu_requests" DROP COLUMN IF EXISTS "sign_placement_claimed_at"`);
    await queryRunner.query(`ALTER TABLE "domiciliu_requests" DROP COLUMN IF EXISTS "sign_placement_claimed_by"`);
    await queryRunner.query(`ALTER TABLE "domiciliu_requests" DROP COLUMN IF EXISTS "sign_placement_requested_by"`);
    await queryRunner.query(`ALTER TABLE "domiciliu_requests" DROP COLUMN IF EXISTS "sign_placement_requested_at"`);
    await queryRunner.query(`ALTER TABLE "domiciliu_requests" DROP COLUMN IF EXISTS "sign_placement_status"`);
  }
}
