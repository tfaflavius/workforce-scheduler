import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rutarea mesajelor din grupurile de departament: catre ce departamente a fost trimis
 * mesajul (target) si cine il vede (audience). Mesajele vechi din grupuri raman vizibile
 * doar in departamentul lor.
 */
export class ChatMessageRouting1772100000000 implements MigrationInterface {
  name = 'ChatMessageRouting1772100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
        ADD COLUMN IF NOT EXISTS "target_dept_ids" jsonb DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "audience_dept_ids" jsonb DEFAULT NULL
    `);
    await queryRunner.query(`
      UPDATE "chat_messages" m
         SET "audience_dept_ids" = jsonb_build_array(c."department_id"::text),
             "target_dept_ids" = jsonb_build_array(c."department_id"::text)
        FROM "chat_conversations" c
       WHERE c."id" = m."conversation_id"
         AND c."type" = 'DEPARTMENT'
         AND m."audience_dept_ids" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_audience"
        ON "chat_messages" USING GIN ("audience_dept_ids")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_messages_audience"`);
    await queryRunner.query(`
      ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "audience_dept_ids",
        DROP COLUMN IF EXISTS "target_dept_ids"
    `);
  }
}
