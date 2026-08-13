import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Locuri de parcare pe nivele (parcari etajate) + seed initial din fisierul
 * "Locuri parcare pe nivele". Seed-ul ruleaza doar daca tabela e goala.
 */
export class CreateParkingLevels1771200000000 implements MigrationInterface {
  name = 'CreateParkingLevels1771200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "parking_levels" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "parking_name" varchar(150) NOT NULL,
        "parking_order" int NOT NULL DEFAULT 0,
        "level_order" int NOT NULL DEFAULT 0,
        "level_number" varchar(50),
        "level_name" varchar(150),
        "total" int NOT NULL DEFAULT 0,
        "normal" int NOT NULL DEFAULT 0,
        "handicap" int NOT NULL DEFAULT 0,
        "mama_copil" int NOT NULL DEFAULT 0,
        "electric" int NOT NULL DEFAULT 0,
        "rezervat" int NOT NULL DEFAULT 0,
        "moto" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_parking_levels" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_parking_levels_order"
      ON "parking_levels" ("parking_order", "level_order")
    `);

    // Seed doar daca tabela e goala (idempotent)
    const existing = await queryRunner.query(`SELECT COUNT(*)::int AS c FROM "parking_levels"`);
    if (existing?.[0]?.c > 0) {
      return;
    }

    await queryRunner.query(`
      INSERT INTO "parking_levels"
        ("parking_name","parking_order","level_order","level_number","level_name","total","normal","handicap","mama_copil","electric","rezervat","moto")
      VALUES
      ('Parcarea Independentei', 0, 0, '-1', 'P1 - Rosu', 66, 59, 0, 2, 5, 0, 0),
      ('Parcarea Independentei', 0, 1, '-2', 'P2 - Verde', 68, 62, 6, 0, 0, 0, 0),
      ('Parcarea Independentei', 0, 2, '-3', 'P3 - Galben', 80, 80, 0, 0, 0, 0, 0),
      ('Parcarea Independentei', 0, 3, '-4', 'P4 - Albastru', 76, 71, 5, 0, 0, 0, 0),
      ('Parcarea Independentei', 0, 4, '-5', 'P5 - Portocaliu', 81, 81, 0, 0, 0, 0, 0),
      ('Parcarea Independentei', 0, 5, '-6', 'P6 - Mov', 77, 77, 0, 0, 0, 0, 0),
      ('Parcarea Brasovului', 1, 0, '-1', 'D', 39, 39, 0, 0, 0, 0, 0),
      ('Parcarea Brasovului', 1, 1, '0', 'PA', 16, 7, 2, 2, 4, 1, 0),
      ('Parcarea Brasovului', 1, 2, '1', 'PB', 39, 38, 1, 0, 0, 0, 0),
      ('Parcarea Brasovului', 1, 3, '2', '1A', 35, 33, 2, 0, 0, 0, 0),
      ('Parcarea Brasovului', 1, 4, '3', '1B', 41, 41, 0, 0, 0, 0, 0),
      ('Parcarea Brasovului', 1, 5, '4', '2A', 34, 32, 2, 0, 0, 0, 0),
      ('Parcarea Brasovului', 1, 6, '5', '2B', 41, 41, 0, 0, 0, 0, 0),
      ('Parcarea Brasovului', 1, 7, '6', '3A', 35, 35, 0, 0, 0, 0, 0),
      ('Parcarea Brasovului', 1, 8, '7', '3B', 41, 41, 0, 0, 0, 0, 0),
      ('Parcarea Brasovului', 1, 9, '8', 'T', 75, 75, 0, 0, 0, 0, 0),
      ('Parcarea Baritiu', 2, 0, '-1', 'P-1', 31, 29, 2, 0, 0, 0, 0),
      ('Parcarea Baritiu', 2, 1, '0', 'P0', 49, 40, 3, 2, 4, 0, 0),
      ('Parcarea Baritiu', 2, 2, '1', 'P1', 28, 28, 0, 0, 0, 0, 4),
      ('Parcarea Baritiu', 2, 3, '2', 'P2', 53, 51, 2, 0, 0, 0, 0),
      ('Parcarea Baritiu', 2, 4, '3', 'P3', 29, 27, 0, 0, 0, 2, 0),
      ('Parcarea Baritiu', 2, 5, '4', 'P4', 53, 52, 1, 0, 0, 0, 0),
      ('Parcarea Baritiu', 2, 6, '5', 'P5', 29, 29, 0, 0, 0, 0, 0),
      ('Parcarea Baritiu', 2, 7, '6', 'P6', 57, 57, 0, 0, 0, 0, 0),
      ('Parcarea Municipal', 3, 0, '0', 'P0', 187, 180, 5, 2, 0, 0, 0),
      ('Parcarea Tribunalului', 4, 0, '-2', 'A1', 50, 48, 2, 0, 0, 0, 0),
      ('Parcarea Tribunalului', 4, 1, '-1', 'A2', 27, 27, 0, 0, 0, 0, 0),
      ('Parcarea Tribunalului', 4, 2, '0', 'B1', 47, 37, 4, 4, 0, 2, 0),
      ('Parcarea Tribunalului', 4, 3, '1', 'B2', 27, 27, 0, 0, 0, 0, 0),
      ('Parcarea Tribunalului', 4, 4, '2', 'C1', 54, 50, 4, 0, 0, 0, 0),
      ('Parcarea Tribunalului', 4, 5, '3', 'C2', 27, 27, 0, 0, 0, 0, 0),
      ('Parcarea Tribunalului', 4, 6, '4', 'D1', 53, 52, 0, 0, 0, 1, 0),
      ('Parcarea Tribunalului', 4, 7, '5', 'D2', 27, 27, 0, 0, 0, 0, 0),
      ('Parcarea Tribunalului', 4, 8, '6', 'E', 54, 54, 0, 0, 0, 0, 0),
      ('Parcarea Tribunalului', 4, 9, '7', 'F1', 27, 27, 0, 0, 0, 0, 0),
      ('Parcarea Tribunalului', 4, 10, '8', 'F2', 54, 54, 0, 0, 0, 0, 0),
      ('Parcarea Iosif Vulcan', 5, 0, '-1', 'A1', 21, 21, 0, 0, 0, 0, 0),
      ('Parcarea Iosif Vulcan', 5, 1, '0', 'A2', 8, 4, 2, 2, 0, 0, 0),
      ('Parcarea Iosif Vulcan', 5, 2, '1', 'B1', 15, 7, 0, 0, 8, 0, 0),
      ('Parcarea Iosif Vulcan', 5, 3, '2', 'B2', 13, 11, 2, 0, 0, 0, 5),
      ('Parcarea Iosif Vulcan', 5, 4, '3', 'C1', 19, 19, 0, 0, 0, 0, 0),
      ('Parcarea Iosif Vulcan', 5, 5, '4', 'C2', 13, 11, 2, 0, 0, 0, 4),
      ('Parcarea Iosif Vulcan', 5, 6, '5', 'D1', 19, 19, 0, 0, 0, 0, 0),
      ('Parcarea Iosif Vulcan', 5, 7, '6', 'D2', 13, 13, 0, 0, 0, 0, 3),
      ('Parcarea Cetate', 6, 0, '0', 'P1', 104, 100, 4, 0, 0, 0, 0),
      ('Parcarea Cetate', 6, 1, '0', 'P2', 121, 108, 5, 2, 6, 0, 31),
      ('Parcarea Doja', 7, 0, '0', 'P0', 87, 84, 3, 0, 0, 0, 0),
      ('Parcarea Doja', 7, 1, '1', 'P1', 93, 90, 3, 0, 0, 0, 0),
      ('Parcarea Doja', 7, 2, '2', 'P2', 112, 107, 5, 0, 0, 0, 0),
      ('Parcarea Doja', 7, 3, '3', 'P3', 110, 94, 6, 0, 10, 0, 0),
      ('Parcarea Doja', 7, 4, '4', 'P4 (terasa)', 114, 110, 4, 0, 0, 0, 0),
      ('Parcarea Primariei', 8, 0, '0', 'P0', 42, 25, 3, 0, 2, 2, 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "parking_levels"`);
  }
}
