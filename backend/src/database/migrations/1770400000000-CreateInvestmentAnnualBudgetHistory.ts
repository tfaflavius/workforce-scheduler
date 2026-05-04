import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvestmentAnnualBudgetHistory1770400000000 implements MigrationInterface {
  name = 'CreateInvestmentAnnualBudgetHistory1770400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "investment_annual_budget_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "year" int NOT NULL,
        "old_amount" decimal(18,2),
        "new_amount" decimal(18,2) NOT NULL,
        "old_notes" text,
        "new_notes" text,
        "changed_by_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_investment_annual_budget_history" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "investment_annual_budget_history"
        ADD CONSTRAINT "FK_iabh_changed_by"
          FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_iabh_year_created_at"
      ON "investment_annual_budget_history" ("year", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "investment_annual_budget_history"`);
  }
}
