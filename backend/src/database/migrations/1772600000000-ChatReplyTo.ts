import { MigrationInterface, QueryRunner } from 'typeorm';

/** Chat: raspuns la un mesaj anume (mesajul citat). */
export class ChatReplyTo1772600000000 implements MigrationInterface {
  name = 'ChatReplyTo1772600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "reply_to_id" uuid DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "reply_to_id"`);
  }
}
