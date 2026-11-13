import { MigrationInterface, QueryRunner } from 'typeorm';

/** Chat in aplicatie: mesaje private, grupuri pe departament si canal de anunturi. */
export class CreateChat1771900000000 implements MigrationInterface {
  name = 'CreateChat1771900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_conversations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" varchar(20) NOT NULL,
        "department_id" uuid,
        "direct_key" varchar(80),
        "last_message_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_chat_conversations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_direct_key"
      ON "chat_conversations" ("direct_key") WHERE "direct_key" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_department"
      ON "chat_conversations" ("department_id") WHERE "department_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_announcements"
      ON "chat_conversations" ("type") WHERE "type" = 'ANNOUNCEMENTS'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversation_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "message" text NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_chat_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_msg_conversation" FOREIGN KEY ("conversation_id")
          REFERENCES "chat_conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_chat_msg_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_conv_created"
      ON "chat_messages" ("conversation_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_reads" (
        "conversation_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "last_read_at" TIMESTAMPTZ NOT NULL,
        CONSTRAINT "PK_chat_reads" PRIMARY KEY ("conversation_id", "user_id"),
        CONSTRAINT "FK_chat_read_conversation" FOREIGN KEY ("conversation_id")
          REFERENCES "chat_conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_chat_read_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_reads"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_conversations"`);
  }
}
