import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { SupabaseModule } from '../../common/supabase/supabase.module';
import { EmailModule } from '../../common/email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), SupabaseModule, EmailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
