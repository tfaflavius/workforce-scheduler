import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParkingCommentsAndHistory1769600000000 implements MigrationInterface {
  name = 'AddParkingCommentsAndHistory1769600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Adăugăm coloană pentru ultima modificare la parking_issues
    await queryRunner.query(`
      ALTER TABLE parking_issues
      ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false
    `);

    // 2. Adăugăm coloană pentru ultima modificare la parking_damages
    await queryRunner.query(`
      ALTER TABLE parking_damages
      ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false
    `);

    // 3. Creăm tabela pentru comentarii la probleme
    await queryRunner.query(`
      CREATE TABLE parking_issue_comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        issue_id UUID NOT NULL REFERENCES parking_issues(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Creăm tabela pentru comentarii la prejudicii
    await queryRunner.query(`
      CREATE TABLE parking_damage_comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        damage_id UUID NOT NULL REFERENCES parking_damages(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Creăm tabela pentru istoricul modificărilor
    await queryRunner.query(`
      CREATE TABLE parking_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('ISSUE', 'DAMAGE', 'COLLECTION')),
        entity_id UUID NOT NULL,
        action VARCHAR(50) NOT NULL CHECK (action IN ('CREATED', 'UPDATED', 'RESOLVED', 'DELETED')),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        changes JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Indexuri pentru performanță
    await queryRunner.query(`CREATE INDEX idx_parking_issue_comments_issue ON parking_issue_comments(issue_id)`);
    await queryRunner.query(`CREATE INDEX idx_parking_damage_comments_damage ON parking_damage_comments(damage_id)`);
    await queryRunner.query(`CREATE INDEX idx_parking_history_entity ON parking_history(entity_type, entity_id)`);
    await queryRunner.query(`CREATE INDEX idx_parking_history_created_at ON parking_history(created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_parking_issues_urgent ON parking_issues(is_urgent) WHERE is_urgent = true`);
    await queryRunner.query(`CREATE INDEX idx_parking_damages_urgent ON parking_damages(is_urgent) WHERE is_urgent = true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parking_damages_urgent`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parking_issues_urgent`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parking_history_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parking_history_entity`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parking_damage_comments_damage`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parking_issue_comments_issue`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS parking_history`);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_damage_comments`);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_issue_comments`);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE parking_damages
      DROP COLUMN IF EXISTS is_urgent,
      DROP COLUMN IF EXISTS last_modified_by
    `);

    await queryRunner.query(`
      ALTER TABLE parking_issues
      DROP COLUMN IF EXISTS is_urgent,
      DROP COLUMN IF EXISTS last_modified_by
    `);
  }
}
