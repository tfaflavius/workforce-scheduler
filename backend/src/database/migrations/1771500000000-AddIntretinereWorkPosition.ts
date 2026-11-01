import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adauga o pozitie de lucru dedicata pentru departamentul "Intretinere Parcari" (INT).
 * Este folosita de pontajul automat: cand un angajat de la Intretinere incepe tura,
 * aplicatia ii creeaza automat o intrare in programul de lucru pe aceasta pozitie.
 * Pana acum existau doar DISP (Dispecerat) si CTRL (Control).
 */
export class AddIntretinereWorkPosition1771500000000 implements MigrationInterface {
  name = 'AddIntretinereWorkPosition1771500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO work_positions (id, name, short_name, color, icon, description, display_order, is_active)
      VALUES (
        '00000000-0000-0000-0000-000000000003',
        'Intretinere',
        'INT',
        '#FF9800',
        'build',
        'Activitate de intretinere parcari (pontaj din aplicatie)',
        3,
        true
      )
      ON CONFLICT (id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM work_positions WHERE id = '00000000-0000-0000-0000-000000000003'`,
    );
  }
}
