import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateEquipmentStockTables1770000000000 implements MigrationInterface {
  name = 'CreateEquipmentStockTables1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. equipment_stock_definitions
    await queryRunner.createTable(
      new Table({
        name: 'equipment_stock_definitions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '150',
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'sort_order',
            type: 'int',
            default: 0,
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

    await queryRunner.createIndex(
      'equipment_stock_definitions',
      new TableIndex({ columnNames: ['category'], name: 'IDX_equipment_stock_def_category' }),
    );

    // 2. equipment_stock_entries
    await queryRunner.createTable(
      new Table({
        name: 'equipment_stock_entries',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'definition_id',
            type: 'uuid',
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'quantity',
            type: 'int',
          },
          {
            name: 'location',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'date_added',
            type: 'date',
          },
          {
            name: 'added_by_id',
            type: 'uuid',
          },
          {
            name: 'last_edited_by_id',
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
      'equipment_stock_entries',
      new TableForeignKey({
        columnNames: ['definition_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'equipment_stock_definitions',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'equipment_stock_entries',
      new TableForeignKey({
        columnNames: ['added_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'equipment_stock_entries',
      new TableForeignKey({
        columnNames: ['last_edited_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'equipment_stock_entries',
      new TableIndex({ columnNames: ['definition_id'], name: 'IDX_equipment_stock_entry_def_id' }),
    );
    await queryRunner.createIndex(
      'equipment_stock_entries',
      new TableIndex({ columnNames: ['category'], name: 'IDX_equipment_stock_entry_category' }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('equipment_stock_entries');
    await queryRunner.dropTable('equipment_stock_definitions');
  }
}
