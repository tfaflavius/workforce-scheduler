import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../modules/users/entities/user.entity';
import { Department } from '../modules/departments/entities/department.entity';
import { WorkSchedule } from '../modules/schedules/entities/work-schedule.entity';
import { ScheduleAssignment } from '../modules/schedules/entities/schedule-assignment.entity';
import { ShiftType } from '../modules/schedules/entities/shift-type.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'workforce_db',
  entities: [User, Department, WorkSchedule, ScheduleAssignment, ShiftType],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
