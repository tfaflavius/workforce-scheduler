import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adauga rolul RESURSE_UMANE (HR) + configurarea de scope pe user:
 *  - hr_visible_department_ids: din ce departamente vede userul HR programele
 *  - hr_only_disp_position: daca vede doar turele de pe pozitia DISP (Dispecerat)
 *
 * Coloana `role` este VARCHAR (cu un CHECK istoric doar pe ADMIN/MANAGER/USER).
 * MASTER_ADMIN deja functioneaza in productie, deci constrangerea a fost relaxata.
 * Eliminam defensiv orice CHECK ramas pe `role` ca sa accepte si RESURSE_UMANE.
 */
export class AddHrRoleAndScope1771000000000 implements MigrationInterface {
  name = 'AddHrRoleAndScope1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Elimina orice constrangere CHECK pe coloana role (daca mai exista)
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT conname FROM pg_constraint
          WHERE conrelid = 'users'::regclass
            AND contype = 'c'
            AND pg_get_constraintdef(oid) ILIKE '%role%'
        LOOP
          EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "hr_visible_department_ids" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "hr_only_disp_position" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "hr_only_disp_position"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "hr_visible_department_ids"`);
  }
}
