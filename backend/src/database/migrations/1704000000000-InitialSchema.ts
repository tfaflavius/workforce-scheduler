import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1704000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);

    // Create departments table
    await queryRunner.query(`
      CREATE TABLE departments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        manager_id UUID,
        parent_department_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'USER')),
        department_id UUID REFERENCES departments(id),
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      )
    `);

    // Add foreign key for departments.manager_id
    await queryRunner.query(`
      ALTER TABLE departments
      ADD CONSTRAINT fk_departments_manager
      FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE departments
      ADD CONSTRAINT fk_departments_parent
      FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL
    `);

    // Create indexes for users
    await queryRunner.query(`CREATE INDEX idx_users_role ON users(role)`);
    await queryRunner.query(`CREATE INDEX idx_users_department ON users(department_id)`);
    await queryRunner.query(`CREATE INDEX idx_users_email ON users(email)`);

    // Create tasks table
    await queryRunner.query(`
      CREATE TABLE tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
        status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
        task_type VARCHAR(100),
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        due_date TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        estimated_hours DECIMAL(5,2),
        actual_hours DECIMAL(5,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to)`);
    await queryRunner.query(`CREATE INDEX idx_tasks_status ON tasks(status)`);
    await queryRunner.query(`CREATE INDEX idx_tasks_priority ON tasks(priority, urgency)`);
    await queryRunner.query(`CREATE INDEX idx_tasks_due_date ON tasks(due_date)`);
    await queryRunner.query(`CREATE INDEX idx_tasks_type ON tasks(task_type)`);

    // Create task_assignment_rules table
    await queryRunner.query(`
      CREATE TABLE task_assignment_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        task_type VARCHAR(100) NOT NULL,
        department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
        role VARCHAR(20) CHECK (role IN ('ADMIN', 'MANAGER', 'USER')),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        priority_min VARCHAR(20),
        priority_max VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create task_history table
    await queryRunner.query(`
      CREATE TABLE task_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
        changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        field_name VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        change_type VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_task_history_task ON task_history(task_id)`);

    // Create time_entries table
    await queryRunner.query(`
      CREATE TABLE time_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE,
        duration_minutes INTEGER,
        is_manual BOOLEAN DEFAULT false,
        manual_adjustment_reason TEXT,
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        approval_status VARCHAR(20) DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_time_entries_user ON time_entries(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_time_entries_date ON time_entries(start_time, end_time)`);
    await queryRunner.query(`CREATE INDEX idx_time_entries_task ON time_entries(task_id)`);

    // Create location_logs table
    await queryRunner.query(`
      CREATE TABLE location_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        location GEOGRAPHY(POINT, 4326) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        accuracy DECIMAL(10, 2),
        recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_auto_recorded BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_location_logs_time_entry ON location_logs(time_entry_id)`);
    await queryRunner.query(`CREATE INDEX idx_location_logs_user ON location_logs(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_location_logs_recorded_at ON location_logs(recorded_at)`);
    await queryRunner.query(`CREATE INDEX idx_location_logs_geography ON location_logs USING GIST(location)`);

    // Create shift_types table
    await queryRunner.query(`
      CREATE TABLE shift_types (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        shift_pattern VARCHAR(20) NOT NULL CHECK (shift_pattern IN ('SHIFT_8H', 'SHIFT_12H')),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        duration_hours DECIMAL(4,2) NOT NULL,
        is_night_shift BOOLEAN DEFAULT false,
        display_order INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create work_schedules table
    await queryRunner.query(`
      CREATE TABLE work_schedules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
        month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
        year INTEGER NOT NULL CHECK (year >= 2024),
        shift_pattern VARCHAR(20) NOT NULL CHECK (shift_pattern IN ('SHIFT_8H', 'SHIFT_12H')),
        status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'ARCHIVED')),
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        approved_by_admin UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(department_id, month, year)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_schedules_month_year ON work_schedules(year, month)`);
    await queryRunner.query(`CREATE INDEX idx_schedules_department ON work_schedules(department_id)`);

    // Create schedule_assignments table
    await queryRunner.query(`
      CREATE TABLE schedule_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        work_schedule_id UUID NOT NULL REFERENCES work_schedules(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        shift_date DATE NOT NULL,
        shift_type_id UUID NOT NULL REFERENCES shift_types(id) ON DELETE RESTRICT,
        is_rest_day BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, shift_date)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_schedule_assignments_schedule ON schedule_assignments(work_schedule_id)`);
    await queryRunner.query(`CREATE INDEX idx_schedule_assignments_user ON schedule_assignments(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_schedule_assignments_date ON schedule_assignments(shift_date)`);

    // Create labor_law_validations table
    await queryRunner.query(`
      CREATE TABLE labor_law_validations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        work_schedule_id UUID NOT NULL REFERENCES work_schedules(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        validation_type VARCHAR(100) NOT NULL,
        is_compliant BOOLEAN NOT NULL,
        violation_details JSONB,
        checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create schedule_change_requests table
    await queryRunner.query(`
      CREATE TABLE schedule_change_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        schedule_assignment_id UUID NOT NULL REFERENCES schedule_assignments(id) ON DELETE CASCADE,
        requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        original_shift_type_id UUID REFERENCES shift_types(id) ON DELETE SET NULL,
        requested_shift_type_id UUID REFERENCES shift_types(id) ON DELETE SET NULL,
        requested_shift_date DATE,
        reason TEXT NOT NULL,
        status VARCHAR(30) DEFAULT 'PENDING_MANAGER' CHECK (status IN ('PENDING_MANAGER', 'MANAGER_APPROVED', 'MANAGER_REJECTED', 'PENDING_ADMIN', 'ADMIN_APPROVED', 'ADMIN_REJECTED')),
        manager_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        manager_reviewed_at TIMESTAMP WITH TIME ZONE,
        manager_comments TEXT,
        admin_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        admin_reviewed_at TIMESTAMP WITH TIME ZONE,
        admin_comments TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_change_requests_status ON schedule_change_requests(status)`);
    await queryRunner.query(`CREATE INDEX idx_change_requests_requested_by ON schedule_change_requests(requested_by)`);

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP WITH TIME ZONE,
        priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_notifications_user ON notifications(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false`);
    await queryRunner.query(`CREATE INDEX idx_notifications_created ON notifications(created_at)`);

    // Create push_subscriptions table
    await queryRunner.query(`
      CREATE TABLE push_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh_key TEXT NOT NULL,
        auth_key TEXT NOT NULL,
        device_info JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id)`);

    // Create generated_reports table
    await queryRunner.query(`
      CREATE TABLE generated_reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        report_type VARCHAR(50) NOT NULL,
        format VARCHAR(10) NOT NULL CHECK (format IN ('PDF', 'EXCEL')),
        generated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parameters JSONB NOT NULL,
        file_url TEXT NOT NULL,
        file_size_bytes BIGINT,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_reports_generated_by ON generated_reports(generated_by)`);
    await queryRunner.query(`CREATE INDEX idx_reports_created ON generated_reports(created_at)`);

    // Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_audit_logs_user ON audit_logs(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_created ON audit_logs(created_at)`);

    // Create system_settings table
    await queryRunner.query(`
      CREATE TABLE system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        description TEXT,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create company_settings table
    await queryRunner.query(`
      CREATE TABLE company_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_name VARCHAR(255) NOT NULL,
        logo_url TEXT,
        primary_color VARCHAR(7),
        secondary_color VARCHAR(7),
        report_header_html TEXT,
        report_footer_html TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default shift types
    await queryRunner.query(`
      INSERT INTO shift_types (name, shift_pattern, start_time, end_time, duration_hours, is_night_shift, display_order)
      VALUES
        ('Tura 1 (06:00-14:00)', 'SHIFT_8H', '06:00', '14:00', 8.0, false, 1),
        ('Tura 2 (14:00-22:00)', 'SHIFT_8H', '14:00', '22:00', 8.0, false, 2),
        ('Tura 3 (22:00-06:00)', 'SHIFT_8H', '22:00', '06:00', 8.0, true, 3),
        ('Tura Zi (08:00-20:00)', 'SHIFT_12H', '08:00', '20:00', 12.0, false, 4),
        ('Tura Noapte (20:00-08:00)', 'SHIFT_12H', '20:00', '08:00', 12.0, true, 5)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS company_settings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS system_settings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS generated_reports CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS push_subscriptions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_change_requests CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS labor_law_validations CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_assignments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS work_schedules CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS shift_types CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS location_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS time_entries CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_assignment_rules CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS tasks CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS departments CASCADE`);

    // Drop extensions
    await queryRunner.query(`DROP EXTENSION IF EXISTS postgis`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
