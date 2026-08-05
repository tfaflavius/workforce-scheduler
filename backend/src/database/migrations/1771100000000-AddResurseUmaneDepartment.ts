import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adauga departamentul "Resurse Umane" (daca nu exista deja), ca sa poata fi
 * atribuit conturilor cu rolul RESURSE_UMANE. Departamentul propriu al userului HR
 * NU influenteaza ce vede (vizibilitatea vine din rol + hr_visible_department_ids).
 */
export class AddResurseUmaneDepartment1771100000000 implements MigrationInterface {
  name = 'AddResurseUmaneDepartment1771100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO departments (name)
      SELECT 'Resurse Umane'
      WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Resurse Umane')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Sterge doar daca nu are useri atasati (evitam FK errors)
    await queryRunner.query(`
      DELETE FROM departments d
      WHERE d.name = 'Resurse Umane'
        AND NOT EXISTS (SELECT 1 FROM users u WHERE u.department_id = d.id)
    `);
  }
}
