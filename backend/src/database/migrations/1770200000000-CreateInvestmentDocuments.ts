import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvestmentDocuments1770200000000 implements MigrationInterface {
  name = 'CreateInvestmentDocuments1770200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "investment_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "file_name" varchar(255) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "file_size" int NOT NULL,
        "file_data" bytea NOT NULL,
        "uploaded_by_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_investment_documents" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "investment_documents" ADD CONSTRAINT "FK_investment_documents_uploaded_by"
          FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "investment_documents"`);
  }
}
