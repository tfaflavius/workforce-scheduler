import { MigrationInterface, QueryRunner } from 'typeorm';

/** Chat: reactii emoji la mesaje. */
export class ChatReactions1772700000000 implements MigrationInterface {
  name = 'ChatReactions1772700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_reactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "message_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "emoji" varchar(16) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_reactions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_chat_reactions_unique" ON "chat_reactions" ("message_id", "user_id", "emoji")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_reactions_message" ON "chat_reactions" ("message_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_reactions"`);
  }
}
