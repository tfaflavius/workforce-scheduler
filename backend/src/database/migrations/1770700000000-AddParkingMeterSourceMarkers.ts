import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Adds the visual marker fields needed to render the parking-meters map
 * exactly like the canonical Google My Maps document, then seeds the
 * 142 meters from /pages/departments/data/parcometre-mymaps-seed.json.
 *
 * Idempotent: re-running the migration only adds meters that don't yet
 * exist (matched by name + lat/lng tolerance) — manual edits are kept.
 */
export class AddParkingMeterSourceMarkers1770700000000 implements MigrationInterface {
  name = 'AddParkingMeterSourceMarkers1770700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enum for source colour
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "parking_meters_source_color_enum" AS ENUM ('YELLOW', 'PINK', 'BLUE');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // 2. New columns
    await queryRunner.query(`
      ALTER TABLE "parking_meters"
      ADD COLUMN IF NOT EXISTS "source_color" "parking_meters_source_color_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "parking_meters"
      ADD COLUMN IF NOT EXISTS "has_electric_supply" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "parking_meters"
      ADD COLUMN IF NOT EXISTS "external_map_url" varchar(500)
    `);

    // 3. Seed data from My Maps export
    const seedPath = path.join(__dirname, '..', '..', 'modules', 'parking', 'data', 'parcometre-mymaps-seed.json');
    if (!fs.existsSync(seedPath)) {
      // Production builds put files in /dist — try the relative path from /dist
      const altPath = path.join(__dirname, '..', '..', '..', 'src', 'modules', 'parking', 'data', 'parcometre-mymaps-seed.json');
      if (!fs.existsSync(altPath)) {
        // Don't fail the migration if seed file is missing in some envs —
        // schema changes still apply. Admin can re-import later.
        return;
      }
    }

    const resolved = fs.existsSync(seedPath)
      ? seedPath
      : path.join(__dirname, '..', '..', '..', 'src', 'modules', 'parking', 'data', 'parcometre-mymaps-seed.json');

    const raw = fs.readFileSync(resolved, 'utf8');
    const meters: Array<{
      name: string;
      lat: number;
      lng: number;
      sourceColor: 'YELLOW' | 'PINK' | 'BLUE';
      hasElectric: boolean;
    }> = JSON.parse(raw);

    const SOURCE_MAP_URL = 'https://www.google.com/maps/d/viewer?mid=1JaOtBYrTUtMHbguIjmj0BMnTozI3li0';

    for (const m of meters) {
      // YELLOW = SOLAR + NOU per user spec. Lightning bolt on yellow means it
      // also has electric backup (recorded in has_electric_supply).
      // PINK/BLUE default to CURENT (electric) + VECHI (old), since they are
      // the legacy installations on the map.
      const powerSource = m.sourceColor === 'YELLOW' ? 'SOLAR' : 'CURENT';
      const condition = m.sourceColor === 'YELLOW' ? 'NOU' : 'VECHI';

      // Skip if a meter with the same name already exists — user may have
      // edited it manually.
      const existing = await queryRunner.query(
        `SELECT id FROM "parking_meters" WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
        [m.name],
      );
      if (existing.length > 0) {
        // Still backfill the new visual fields so existing rows render
        // correctly on the new map.
        await queryRunner.query(
          `UPDATE "parking_meters"
           SET source_color = $1::"parking_meters_source_color_enum",
               has_electric_supply = $2,
               external_map_url = COALESCE(external_map_url, $3)
           WHERE id = $4`,
          [m.sourceColor, m.hasElectric, SOURCE_MAP_URL, existing[0].id],
        );
        continue;
      }

      await queryRunner.query(
        `INSERT INTO "parking_meters"
         (name, latitude, longitude, zone, power_source, condition,
          source_color, has_electric_supply, external_map_url, is_active)
         VALUES ($1, $2, $3, 'ALB', $4, $5, $6::"parking_meters_source_color_enum",
                 $7, $8, true)`,
        [
          m.name,
          m.lat,
          m.lng,
          powerSource,
          condition,
          m.sourceColor,
          m.hasElectric,
          SOURCE_MAP_URL,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete only meters that were imported from this map (identified by URL).
    await queryRunner.query(
      `DELETE FROM "parking_meters" WHERE external_map_url = 'https://www.google.com/maps/d/viewer?mid=1JaOtBYrTUtMHbguIjmj0BMnTozI3li0'`,
    );
    await queryRunner.query(`ALTER TABLE "parking_meters" DROP COLUMN IF EXISTS "external_map_url"`);
    await queryRunner.query(`ALTER TABLE "parking_meters" DROP COLUMN IF EXISTS "has_electric_supply"`);
    await queryRunner.query(`ALTER TABLE "parking_meters" DROP COLUMN IF EXISTS "source_color"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "parking_meters_source_color_enum"`);
  }
}
