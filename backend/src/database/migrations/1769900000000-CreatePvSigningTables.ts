import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePvSigningTables1769900000000 implements MigrationInterface {
  name = 'CreatePvSigningTables1769900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. pv_signing_sessions
    await queryRunner.createTable(
      new Table({
        name: 'pv_signing_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'DRAFT'",
          },
          {
            name: 'month_year',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'uuid',
          },
          {
            name: 'last_modified_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'pv_signing_sessions',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'pv_signing_sessions',
      new TableForeignKey({
        columnNames: ['last_modified_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // 2. pv_signing_days
    await queryRunner.createTable(
      new Table({
        name: 'pv_signing_days',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'session_id',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'OPEN'",
          },
          {
            name: 'signing_date',
            type: 'date',
          },
          {
            name: 'day_order',
            type: 'int',
          },
          {
            name: 'notice_count',
            type: 'int',
            default: 30,
          },
          {
            name: 'first_notice_series',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'first_notice_number',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'last_notice_series',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'last_notice_number',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'notices_date_from',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'notices_date_to',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'maintenance_user1_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'maintenance_user1_claimed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'maintenance_user2_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'maintenance_user2_claimed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'completion_observations',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'completed_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'pv_signing_days',
      new TableForeignKey({
        columnNames: ['session_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'pv_signing_sessions',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'pv_signing_days',
      new TableForeignKey({
        columnNames: ['maintenance_user1_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'pv_signing_days',
      new TableForeignKey({
        columnNames: ['maintenance_user2_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'pv_signing_days',
      new TableForeignKey({
        columnNames: ['completed_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // 3. pv_signing_session_comments
    await queryRunner.createTable(
      new Table({
        name: 'pv_signing_session_comments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'session_id',
            type: 'uuid',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'pv_signing_session_comments',
      new TableForeignKey({
        columnNames: ['session_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'pv_signing_sessions',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'pv_signing_session_comments',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'RESTRICT',
      }),
    );

    // Indexes
    await queryRunner.createIndex(
      'pv_signing_days',
      new TableIndex({ columnNames: ['session_id'], name: 'IDX_pv_signing_days_session_id' }),
    );
    await queryRunner.createIndex(
      'pv_signing_days',
      new TableIndex({ columnNames: ['status'], name: 'IDX_pv_signing_days_status' }),
    );
    await queryRunner.createIndex(
      'pv_signing_session_comments',
      new TableIndex({ columnNames: ['session_id'], name: 'IDX_pv_signing_comments_session_id' }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pv_signing_session_comments');
    await queryRunner.dropTable('pv_signing_days');
    await queryRunner.dropTable('pv_signing_sessions');
  }
}
