import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateParkingTables1769500000000 implements MigrationInterface {
  name = 'CreateParkingTables1769500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Creare departament "Întreținere Parcări"
    await queryRunner.query(`
      INSERT INTO departments (id, name, created_at, updated_at)
      VALUES (
        uuid_generate_v4(),
        'Întreținere Parcări',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (name) DO NOTHING
    `);

    // 2. Creare tabelă parking_lots
    await queryRunner.query(`
      CREATE TABLE parking_lots (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        address VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Creare tabelă payment_machines
    await queryRunner.query(`
      CREATE TABLE payment_machines (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        parking_lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
        machine_number VARCHAR(10) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(parking_lot_id, machine_number)
      )
    `);

    // 4. Creare tabelă parking_issues
    await queryRunner.query(`
      CREATE TABLE parking_issues (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        parking_lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE RESTRICT,
        equipment VARCHAR(255) NOT NULL,
        contacted_company VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FINALIZAT')),
        resolution_description TEXT,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Creare tabelă parking_damages
    await queryRunner.query(`
      CREATE TABLE parking_damages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        parking_lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE RESTRICT,
        damaged_equipment VARCHAR(255) NOT NULL,
        person_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        car_plate VARCHAR(20) NOT NULL,
        description TEXT NOT NULL,
        signature_data TEXT,
        status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FINALIZAT')),
        resolution_type VARCHAR(50) CHECK (resolution_type IN ('RECUPERAT', 'TRIMIS_JURIDIC')),
        resolution_description TEXT,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Creare tabelă cash_collections
    await queryRunner.query(`
      CREATE TABLE cash_collections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        parking_lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE RESTRICT,
        payment_machine_id UUID NOT NULL REFERENCES payment_machines(id) ON DELETE RESTRICT,
        amount DECIMAL(10,2) NOT NULL,
        collected_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Creare indexuri pentru performanță
    await queryRunner.query(`CREATE INDEX idx_parking_issues_status ON parking_issues(status)`);
    await queryRunner.query(`CREATE INDEX idx_parking_issues_parking_lot ON parking_issues(parking_lot_id)`);
    await queryRunner.query(`CREATE INDEX idx_parking_issues_assigned_to ON parking_issues(assigned_to)`);
    await queryRunner.query(`CREATE INDEX idx_parking_issues_created_at ON parking_issues(created_at DESC)`);

    await queryRunner.query(`CREATE INDEX idx_parking_damages_status ON parking_damages(status)`);
    await queryRunner.query(`CREATE INDEX idx_parking_damages_parking_lot ON parking_damages(parking_lot_id)`);
    await queryRunner.query(`CREATE INDEX idx_parking_damages_created_at ON parking_damages(created_at DESC)`);

    await queryRunner.query(`CREATE INDEX idx_cash_collections_parking_lot ON cash_collections(parking_lot_id)`);
    await queryRunner.query(`CREATE INDEX idx_cash_collections_machine ON cash_collections(payment_machine_id)`);
    await queryRunner.query(`CREATE INDEX idx_cash_collections_collected_at ON cash_collections(collected_at DESC)`);

    // 8. Seed date parcări și automate
    // Parcare Baritiu
    await queryRunner.query(`
      INSERT INTO parking_lots (id, name, code) VALUES
      ('a1000000-0000-0000-0000-000000000001', 'Parcare Baritiu', 'BARITIU')
    `);
    await queryRunner.query(`
      INSERT INTO payment_machines (parking_lot_id, machine_number) VALUES
      ('a1000000-0000-0000-0000-000000000001', '631'),
      ('a1000000-0000-0000-0000-000000000001', '632')
    `);

    // Parcarea Doja
    await queryRunner.query(`
      INSERT INTO parking_lots (id, name, code) VALUES
      ('a1000000-0000-0000-0000-000000000002', 'Parcarea Doja', 'DOJA')
    `);
    await queryRunner.query(`
      INSERT INTO payment_machines (parking_lot_id, machine_number) VALUES
      ('a1000000-0000-0000-0000-000000000002', '681'),
      ('a1000000-0000-0000-0000-000000000002', '682'),
      ('a1000000-0000-0000-0000-000000000002', '683')
    `);

    // Parcarea Brașovului
    await queryRunner.query(`
      INSERT INTO parking_lots (id, name, code) VALUES
      ('a1000000-0000-0000-0000-000000000003', 'Parcarea Brașovului', 'BRASOVULUI')
    `);
    await queryRunner.query(`
      INSERT INTO payment_machines (parking_lot_id, machine_number) VALUES
      ('a1000000-0000-0000-0000-000000000003', '611'),
      ('a1000000-0000-0000-0000-000000000003', '612')
    `);

    // Parcarea Independenței
    await queryRunner.query(`
      INSERT INTO parking_lots (id, name, code) VALUES
      ('a1000000-0000-0000-0000-000000000004', 'Parcarea Independenței', 'INDEPENDENTEI')
    `);
    await queryRunner.query(`
      INSERT INTO payment_machines (parking_lot_id, machine_number) VALUES
      ('a1000000-0000-0000-0000-000000000004', '601'),
      ('a1000000-0000-0000-0000-000000000004', '602')
    `);

    // Parcarea Iosif Vulcan
    await queryRunner.query(`
      INSERT INTO parking_lots (id, name, code) VALUES
      ('a1000000-0000-0000-0000-000000000005', 'Parcarea Iosif Vulcan', 'IOSIF_VULCAN')
    `);
    await queryRunner.query(`
      INSERT INTO payment_machines (parking_lot_id, machine_number) VALUES
      ('a1000000-0000-0000-0000-000000000005', '661')
    `);

    // Parcarea Tribunalului
    await queryRunner.query(`
      INSERT INTO parking_lots (id, name, code) VALUES
      ('a1000000-0000-0000-0000-000000000006', 'Parcarea Tribunalului', 'TRIBUNALULUI')
    `);
    await queryRunner.query(`
      INSERT INTO payment_machines (parking_lot_id, machine_number) VALUES
      ('a1000000-0000-0000-0000-000000000006', '651'),
      ('a1000000-0000-0000-0000-000000000006', '652')
    `);

    // Parcarea Spital Municipal
    await queryRunner.query(`
      INSERT INTO parking_lots (id, name, code) VALUES
      ('a1000000-0000-0000-0000-000000000007', 'Parcarea Spital Municipal', 'SPITAL_MUNICIPAL')
    `);
    await queryRunner.query(`
      INSERT INTO payment_machines (parking_lot_id, machine_number) VALUES
      ('a1000000-0000-0000-0000-000000000007', '641')
    `);

    // Parcarea Cetate
    await queryRunner.query(`
      INSERT INTO parking_lots (id, name, code) VALUES
      ('a1000000-0000-0000-0000-000000000008', 'Parcarea Cetate', 'CETATE')
    `);
    await queryRunner.query(`
      INSERT INTO payment_machines (parking_lot_id, machine_number) VALUES
      ('a1000000-0000-0000-0000-000000000008', '671'),
      ('a1000000-0000-0000-0000-000000000008', '672'),
      ('a1000000-0000-0000-0000-000000000008', '673')
    `);

    // Parcarea Primărie
    await queryRunner.query(`
      INSERT INTO parking_lots (id, name, code) VALUES
      ('a1000000-0000-0000-0000-000000000009', 'Parcarea Primărie', 'PRIMARIE')
    `);
    await queryRunner.query(`
      INSERT INTO payment_machines (parking_lot_id, machine_number) VALUES
      ('a1000000-0000-0000-0000-000000000009', '621')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cash_collections_collected_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cash_collections_machine`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cash_collections_parking_lot`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parking_damages_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parking_damages_parking_lot`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parking_damages_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parking_issues_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parking_issues_assigned_to`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parking_issues_parking_lot`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parking_issues_status`);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS cash_collections`);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_damages`);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_issues`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_machines`);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_lots`);

    // Delete department (optional)
    await queryRunner.query(`DELETE FROM departments WHERE name = 'Întreținere Parcări'`);
  }
}
