import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkPositions1704000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create work_positions table
    await queryRunner.query(`
      CREATE TABLE work_positions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        short_name VARCHAR(10) NOT NULL,
        color VARCHAR(7) NOT NULL DEFAULT '#2196F3',
        icon VARCHAR(50),
        description TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default work positions (Dispecerat as first/default)
    await queryRunner.query(`
      INSERT INTO work_positions (id, name, short_name, color, icon, description, display_order, is_active)
      VALUES
        ('00000000-0000-0000-0000-000000000001', 'Dispecerat', 'DISP', '#2196F3', 'headset', 'Activitate in dispecerat', 1, true),
        ('00000000-0000-0000-0000-000000000002', 'Control', 'CTRL', '#4CAF50', 'search', 'Activitate de control', 2, true)
    `);

    // Add work_position_id column to schedule_assignments
    // Default to Dispecerat (00000000-0000-0000-0000-000000000001) for all existing assignments
    await queryRunner.query(`
      ALTER TABLE schedule_assignments
      ADD COLUMN work_position_id UUID REFERENCES work_positions(id) ON DELETE SET NULL
      DEFAULT '00000000-0000-0000-0000-000000000001'
    `);

    // Update all existing records to have Dispecerat as their work position
    await queryRunner.query(`
      UPDATE schedule_assignments
      SET work_position_id = '00000000-0000-0000-0000-000000000001'
      WHERE work_position_id IS NULL
    `);

    // Create index for work_position_id
    await queryRunner.query(`
      CREATE INDEX idx_schedule_assignments_work_position ON schedule_assignments(work_position_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove index
    await queryRunner.query(`DROP INDEX IF EXISTS idx_schedule_assignments_work_position`);

    // Remove column from schedule_assignments
    await queryRunner.query(`ALTER TABLE schedule_assignments DROP COLUMN IF EXISTS work_position_id`);

    // Drop work_positions table
    await queryRunner.query(`DROP TABLE IF EXISTS work_positions CASCADE`);
  }
}
