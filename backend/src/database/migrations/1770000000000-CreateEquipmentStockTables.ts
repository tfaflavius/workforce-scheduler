import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEquipmentStockTables1770000000000 implements MigrationInterface {
  name = 'CreateEquipmentStockTables1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tables may already exist if synchronize:true ran before migrations were added.
    // Using IF NOT EXISTS to make this migration idempotent.

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "equipment_stock_definitions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(150) NOT NULL,
        "category" varchar(50) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_equipment_stock_definitions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "equipment_stock_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "definition_id" uuid NOT NULL,
        "category" varchar(50) NOT NULL,
        "quantity" int NOT NULL,
        "location" varchar(255),
        "notes" text,
        "date_added" date NOT NULL,
        "added_by_id" uuid NOT NULL,
        "last_edited_by_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_equipment_stock_entries" PRIMARY KEY ("id")
      )
    `);

    // Foreign keys — skip if already exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "equipment_stock_entries" ADD CONSTRAINT "FK_equipment_stock_entries_definition" FOREIGN KEY ("definition_id") REFERENCES "equipment_stock_definitions"("id") ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "equipment_stock_entries" ADD CONSTRAINT "FK_equipment_stock_entries_added_by" FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "equipment_stock_entries" ADD CONSTRAINT "FK_equipment_stock_entries_last_edited_by" FOREIGN KEY ("last_edited_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_equipment_stock_def_category" ON "equipment_stock_definitions" ("category")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_equipment_stock_entry_def_id" ON "equipment_stock_entries" ("definition_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_equipment_stock_entry_category" ON "equipment_stock_entries" ("category")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "equipment_stock_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipment_stock_definitions"`);
  }
}
