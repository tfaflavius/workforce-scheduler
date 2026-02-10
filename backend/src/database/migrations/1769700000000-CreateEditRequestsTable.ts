import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateEditRequestsTable1769700000000 implements MigrationInterface {
  name = 'CreateEditRequestsTable1769700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'edit_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'request_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'entity_id',
            type: 'uuid',
          },
          {
            name: 'proposed_changes',
            type: 'jsonb',
          },
          {
            name: 'original_data',
            type: 'jsonb',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'PENDING'",
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'requested_by',
            type: 'uuid',
          },
          {
            name: 'reviewed_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reviewed_at',
            type: 'timestamptz',
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

    // Foreign key for requested_by
    await queryRunner.createForeignKey(
      'edit_requests',
      new TableForeignKey({
        columnNames: ['requested_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'RESTRICT',
      }),
    );

    // Foreign key for reviewed_by
    await queryRunner.createForeignKey(
      'edit_requests',
      new TableForeignKey({
        columnNames: ['reviewed_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_edit_requests_status" ON "edit_requests" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_edit_requests_requested_by" ON "edit_requests" ("requested_by")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_edit_requests_request_type" ON "edit_requests" ("request_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_edit_requests_request_type"`);
    await queryRunner.query(`DROP INDEX "IDX_edit_requests_requested_by"`);
    await queryRunner.query(`DROP INDEX "IDX_edit_requests_status"`);
    await queryRunner.dropTable('edit_requests');
  }
}
