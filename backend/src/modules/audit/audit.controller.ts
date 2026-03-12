import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService, AuditLogFilters } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth('JWT')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: AuditLogFilters = {
      userId,
      entity,
      entityId,
      action,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };
    return this.auditService.findAll(filters);
  }

  @Get('recent')
  async getRecent(@Query('limit') limit?: string) {
    return this.auditService.getRecentActivity(limit ? parseInt(limit, 10) : 20);
  }

  @Get('entity-history')
  async getEntityHistory(
    @Query('entity') entity: string,
    @Query('entityId') entityId: string,
  ) {
    return this.auditService.getEntityHistory(entity, entityId);
  }

  @Get('user-activity')
  async getUserActivity(
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getUserActivity(userId, limit ? parseInt(limit, 10) : 50);
  }
}
