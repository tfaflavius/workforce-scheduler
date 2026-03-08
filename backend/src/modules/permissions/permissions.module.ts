import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { Permission } from './entities/permission.entity';
import { UserPermissionOverride } from './entities/user-permission-override.entity';
import { TaskFlowRule } from './entities/task-flow-rule.entity';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Permission,
      UserPermissionOverride,
      TaskFlowRule,
      Department,
      User,
    ]),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
