import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adauga o pozitie de lucru generica "Program" (PRG) pentru programul de birou 07:30-15:30.
 * Este folosita de precompletarea automata a programului pentru departamentele de birou
 * (Procese Verbale/Facturare, Achizitii, Parcometre, Parcari Handicap, Parcari Domiciliu).
 */
export class AddProgramWorkPosition1771600000000 implements MigrationInterface {
  name = 'AddProgramWorkPosition1771600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO work_positions (id, name, short_name, color, icon, description, display_order, is_active)
      VALUES (
        '00000000-0000-0000-0000-000000000004',
        'Program',
        'PRG',
        '#0891b2',
        'schedule',
        'Program de lucru de birou (07:30-15:30), precompletat automat',
        4,
        true
      )
      ON CONFLICT (id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM work_positions WHERE id = '00000000-0000-0000-0000-000000000004'`,
    );
  }
}
