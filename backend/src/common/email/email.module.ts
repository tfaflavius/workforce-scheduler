import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { User } from '../../modules/users/entities/user.entity';
import { EmailNotificationRule } from '../../modules/permissions/entities/email-notification-rule.entity';
import { EmailRuleCheckerService } from '../services/email-rule-checker.service';

@Global()
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User, EmailNotificationRule])],
  controllers: [EmailController],
  providers: [EmailService, EmailRuleCheckerService],
  exports: [EmailService, EmailRuleCheckerService],
})
export class EmailModule {}
