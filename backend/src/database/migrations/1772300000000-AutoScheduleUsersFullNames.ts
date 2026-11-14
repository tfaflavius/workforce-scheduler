import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A doua trecere pentru programul fix automat: potrivire si cand numele din aplicatie are
 * un prenume in plus (ex. "Borz Mircea Radu", "Puscas Bogdan Lucian") + Dobre Gabriel.
 * Seteaza doar unde nu exista deja o ora; daca un nume se potriveste cu mai multi oameni,
 * nu atinge nimic (se seteaza din Utilizatori).
 */
const AUTO_USERS: Array<{ name: string; start: string }> = [
  { name: 'Bocsan Dorin', start: '07:30' },
  { name: 'Lazar Ovidiu', start: '07:30' },
  { name: 'Puscas Bogdan', start: '07:30' },
  { name: 'Duma Gheorghe', start: '07:30' },
  { name: 'Octavian Farcuta', start: '07:30' },
  { name: 'Mircea Borz', start: '07:30' },
  { name: 'Mariana Borz', start: '07:30' },
  { name: 'Mircea Olah', start: '07:30' },
  { name: 'Dobre Gabriel', start: '07:30' },
  { name: 'Kelemen Laszlo', start: '08:00' },
];

function tokens(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);
}

export class AutoScheduleUsersFullNames1772300000000 implements MigrationInterface {
  name = 'AutoScheduleUsersFullNames1772300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const users: Array<{ id: string; full_name: string; auto_schedule_start: string | null }> =
      await queryRunner.query(
        `SELECT id, full_name, auto_schedule_start FROM "users" WHERE is_active = true`,
      );
    const prepared = users.map((u) => ({ ...u, t: new Set(tokens(u.full_name || '')) }));
    for (const wanted of AUTO_USERS) {
      const need = tokens(wanted.name);
      const matches = prepared.filter((u) => need.every((n) => u.t.has(n)));
      if (matches.length !== 1) {
        console.warn(
          `[AutoScheduleUsers] "${wanted.name}": ${matches.length} potriviri — setati programul din Utilizatori`,
        );
        continue;
      }
      if (matches[0].auto_schedule_start) continue;
      await queryRunner.query(`UPDATE "users" SET "auto_schedule_start" = $1 WHERE "id" = $2`, [
        wanted.start,
        matches[0].id,
      ]);
    }
  }

  public async down(): Promise<void> {
    // nimic: setarile raman editabile din Utilizatori
  }
}
