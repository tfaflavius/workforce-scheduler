import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './common/supabase/supabase.module';
import { EmailModule } from './common/email/email.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ShiftSwapsModule } from './modules/shift-swaps/shift-swaps.module';
import { User } from './modules/users/entities/user.entity';
import { Department } from './modules/departments/entities/department.entity';
import { WorkSchedule } from './modules/schedules/entities/work-schedule.entity';
import { ScheduleAssignment } from './modules/schedules/entities/schedule-assignment.entity';
import { ShiftType } from './modules/schedules/entities/shift-type.entity';
import { Notification } from './modules/notifications/entities/notification.entity';
import { ShiftSwapRequest } from './modules/shift-swaps/entities/shift-swap-request.entity';
import { ShiftSwapResponse } from './modules/shift-swaps/entities/shift-swap-response.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SupabaseModule,
    EmailModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'workforce_db',
      entities: [User, Department, WorkSchedule, ScheduleAssignment, ShiftType, Notification, ShiftSwapRequest, ShiftSwapResponse],
      synchronize: true,
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }),
    AuthModule,
    UsersModule,
    DepartmentsModule,
    SchedulesModule,
    NotificationsModule,
    ShiftSwapsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

