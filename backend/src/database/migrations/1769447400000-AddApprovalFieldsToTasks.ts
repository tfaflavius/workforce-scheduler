import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddApprovalFieldsToTasks1769447400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add approvalStatus column
    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'approval_status',
        type: 'varchar',
        length: '20',
        default: "'PENDING_APPROVAL'",
        isNullable: false,
      }),
    );

    // Add approvedBy column
    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'approved_by',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add approvedAt column
    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'approved_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Add rejectionReason column
    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'rejection_reason',
        type: 'text',
        isNullable: true,
      }),
    );

    // Add foreign key for approvedBy
    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['approved_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('tasks');
    const foreignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('approved_by') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('tasks', foreignKey);
    }

    // Drop columns
    await queryRunner.dropColumn('tasks', 'rejection_reason');
    await queryRunner.dropColumn('tasks', 'approved_at');
    await queryRunner.dropColumn('tasks', 'approved_by');
    await queryRunner.dropColumn('tasks', 'approval_status');
  }
}
