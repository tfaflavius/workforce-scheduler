import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDiacriticsFromData1769800000000 implements MigrationInterface {
  name = 'RemoveDiacriticsFromData1769800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Functie SQL temporara pentru a sterge diacriticile romanesti
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION remove_romanian_diacritics(input_text TEXT)
      RETURNS TEXT AS $$
      BEGIN
        RETURN translate(
          input_text,
          '\u0103\u00e2\u00ee\u0219\u021b\u0102\u00c2\u00ce\u0218\u021a\u015f\u0163\u015e\u0162',
          'aaisttAISTstST'
        );
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // Actualizeaza numele departamentelor
    await queryRunner.query(`
      UPDATE departments
      SET name = remove_romanian_diacritics(name),
          updated_at = CURRENT_TIMESTAMP
      WHERE name != remove_romanian_diacritics(name)
    `);

    // Actualizeaza numele utilizatorilor
    await queryRunner.query(`
      UPDATE users
      SET full_name = remove_romanian_diacritics(full_name),
          updated_at = CURRENT_TIMESTAMP
      WHERE full_name != remove_romanian_diacritics(full_name)
    `);

    // Actualizeaza person_name in parking_damages
    await queryRunner.query(`
      UPDATE parking_damages
      SET person_name = remove_romanian_diacritics(person_name)
      WHERE person_name IS NOT NULL
        AND person_name != remove_romanian_diacritics(person_name)
    `);

    // Actualizeaza person_name in handicap_requests
    await queryRunner.query(`
      UPDATE handicap_requests
      SET person_name = remove_romanian_diacritics(person_name)
      WHERE person_name IS NOT NULL
        AND person_name != remove_romanian_diacritics(person_name)
    `);

    // Actualizeaza person_name in domiciliu_requests
    await queryRunner.query(`
      UPDATE domiciliu_requests
      SET person_name = remove_romanian_diacritics(person_name)
      WHERE person_name IS NOT NULL
        AND person_name != remove_romanian_diacritics(person_name)
    `);

    // Actualizeaza person_name in handicap_legitimations
    await queryRunner.query(`
      UPDATE handicap_legitimations
      SET person_name = remove_romanian_diacritics(person_name)
      WHERE person_name IS NOT NULL
        AND person_name != remove_romanian_diacritics(person_name)
    `);

    // Actualizeaza person_name in revolutionar_legitimations
    await queryRunner.query(`
      UPDATE revolutionar_legitimations
      SET person_name = remove_romanian_diacritics(person_name)
      WHERE person_name IS NOT NULL
        AND person_name != remove_romanian_diacritics(person_name)
    `);

    // Sterge functia temporara
    await queryRunner.query(`DROP FUNCTION IF EXISTS remove_romanian_diacritics(TEXT)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nu se poate reveni la diacritice originale
    // Aceasta migrare este unidirectionala
  }
}
