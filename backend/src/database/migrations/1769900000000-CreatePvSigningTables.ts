import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePvSigningTables1769900000000 implements MigrationInterface {
  name = 'CreatePvSigningTables1769900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tables may already exist if synchronize:true ran before migrations were added.
    // Using IF NOT EXISTS to make this migration idempotent.

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pv_signing_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "month_year" varchar(10) NOT NULL,
        "description" text,
        "created_by" uuid NOT NULL,
        "last_modified_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_pv_signing_sessions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pv_signing_days" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "session_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'OPEN',
        "signing_date" date NOT NULL,
        "day_order" int NOT NULL,
        "notice_count" int NOT NULL DEFAULT 30,
        "first_notice_series" varchar(20),
        "first_notice_number" varchar(30),
        "last_notice_series" varchar(20),
        "last_notice_number" varchar(30),
        "notices_date_from" date,
        "notices_date_to" date,
        "maintenance_user1_id" uuid,
        "maintenance_user1_claimed_at" TIMESTAMPTZ,
        "maintenance_user2_id" uuid,
        "maintenance_user2_claimed_at" TIMESTAMPTZ,
        "completion_observations" text,
        "completed_at" TIMESTAMPTZ,
        "completed_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_pv_signing_days" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pv_signing_session_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "session_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "content" text NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_pv_signing_session_comments" PRIMARY KEY ("id")
      )
    `);

    // Foreign keys — skip if already exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "pv_signing_sessions" ADD CONSTRAINT "FK_pv_signing_sessions_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "pv_signing_sessions" ADD CONSTRAINT "FK_pv_signing_sessions_last_modified_by" FOREIGN KEY ("last_modified_by") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "pv_signing_days" ADD CONSTRAINT "FK_pv_signing_days_session_id" FOREIGN KEY ("session_id") REFERENCES "pv_signing_sessions"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "pv_signing_days" ADD CONSTRAINT "FK_pv_signing_days_maintenance_user1" FOREIGN KEY ("maintenance_user1_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "pv_signing_days" ADD CONSTRAINT "FK_pv_signing_days_maintenance_user2" FOREIGN KEY ("maintenance_user2_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "pv_signing_days" ADD CONSTRAINT "FK_pv_signing_days_completed_by" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "pv_signing_session_comments" ADD CONSTRAINT "FK_pv_signing_comments_session_id" FOREIGN KEY ("session_id") REFERENCES "pv_signing_sessions"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "pv_signing_session_comments" ADD CONSTRAINT "FK_pv_signing_comments_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pv_signing_days_session_id" ON "pv_signing_days" ("session_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pv_signing_days_status" ON "pv_signing_days" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pv_signing_comments_session_id" ON "pv_signing_session_comments" ("session_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pv_signing_session_comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pv_signing_days"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pv_signing_sessions"`);
  }
}
