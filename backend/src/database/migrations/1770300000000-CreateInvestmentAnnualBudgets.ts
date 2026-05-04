import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvestmentAnnualBudgets1770300000000 implements MigrationInterface {
  name = 'CreateInvestmentAnnualBudgets1770300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "investment_annual_budgets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "year" int NOT NULL,
        "total_amount" decimal(18,2) NOT NULL,
        "notes" text,
        "last_modified_by_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_investment_annual_budgets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_investment_annual_budgets_year" UNIQUE ("year")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "investment_annual_budgets"
        ADD CONSTRAINT "FK_investment_annual_budgets_user"
          FOREIGN KEY ("last_modified_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "investment_annual_budgets"`);
  }
}
