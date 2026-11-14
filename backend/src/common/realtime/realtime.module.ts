import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { RealtimeService } from './realtime.service';
import { RealtimeController } from './realtime.controller';

/** Notificari si chat in timp real (Server-Sent Events). */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
