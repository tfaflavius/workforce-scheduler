import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER_ADMIN)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('matrix')
  getMatrix() {
    return this.permissionsService.getMatrix();
  }

  @Put('bulk')
  bulkUpdate(@Body() body: { updates: { id: string; allowed: boolean }[] }) {
    return this.permissionsService.bulkUpdate(body.updates);
  }

  @Patch(':id')
  updateOne(@Param('id') id: string, @Body() body: { allowed: boolean }) {
    return this.permissionsService.updateOne(id, body.allowed);
  }

  @Get('users/:userId')
  getUserOverrides(@Param('userId') userId: string) {
    return this.permissionsService.getUserOverrides(userId);
  }

  @Put('users/:userId')
  setUserOverrides(
    @Param('userId') userId: string,
    @Body() body: { overrides: { resourceKey: string; action: string; allowed: boolean }[] },
  ) {
    return this.permissionsService.setUserOverrides(userId, body.overrides);
  }

  @Delete('users/:userId/:overrideId')
  removeUserOverride(@Param('overrideId') overrideId: string) {
    return this.permissionsService.removeUserOverride(overrideId);
  }

  @Get('effective/:userId')
  getEffectivePermissions(@Param('userId') userId: string) {
    return this.permissionsService.getEffectivePermissions(userId);
  }

  @Get('task-flows')
  getTaskFlows() {
    return this.permissionsService.getTaskFlows();
  }

  @Post('task-flows')
  createTaskFlow(@Body() body: any) {
    return this.permissionsService.createTaskFlow(body);
  }

  @Patch('task-flows/:id')
  updateTaskFlow(@Param('id') id: string, @Body() body: any) {
    return this.permissionsService.updateTaskFlow(id, body);
  }

  @Delete('task-flows/:id')
  deleteTaskFlow(@Param('id') id: string) {
    return this.permissionsService.deleteTaskFlow(id);
  }

  @Get('email-rules')
  getEmailRules() {
    return this.permissionsService.getEmailNotificationRules();
  }

  @Post('email-rules')
  createEmailRule(@Body() body: any) {
    return this.permissionsService.createEmailNotificationRule(body);
  }

  @Patch('email-rules/:id')
  updateEmailRule(@Param('id') id: string, @Body() body: any) {
    return this.permissionsService.updateEmailNotificationRule(id, body);
  }

  @Delete('email-rules/:id')
  deleteEmailRule(@Param('id') id: string) {
    return this.permissionsService.deleteEmailNotificationRule(id);
  }

  @Post('seed')
  seedDefaults() {
    return this.permissionsService.seedDefaults();
  }

  @Get('summary')
  getSummary() {
    return this.permissionsService.getSummary();
  }

  // ─── Notification Settings ──────────────────────────

  @Get('notification-settings')
  getNotificationSettings() {
    return this.permissionsService.getNotificationSettings();
  }

  @Put('notification-settings/bulk')
  bulkUpdateNotificationSettings(
    @Body() body: { updates: { id: string; inAppEnabled: boolean; pushEnabled: boolean }[] },
  ) {
    return this.permissionsService.bulkUpdateNotificationSettings(body.updates);
  }

  // ─── Parking Equipment ──────────────────────────────────────────

  @Get('equipment')
  getEquipment() {
    return this.permissionsService.getEquipment();
  }

  @Post('equipment')
  createEquipment(@Body() body: any) {
    return this.permissionsService.createEquipment(body);
  }

  @Patch('equipment/:id')
  updateEquipment(@Param('id') id: string, @Body() body: any) {
    return this.permissionsService.updateEquipment(id, body);
  }

  @Delete('equipment/:id')
  deleteEquipment(@Param('id') id: string) {
    return this.permissionsService.deleteEquipment(id);
  }

  @Post('seed-equipment')
  seedEquipment() {
    return this.permissionsService.seedEquipment();
  }

  // ─── Contact Firms ──────────────────────────────────────────────

  @Get('firms')
  getContactFirms() {
    return this.permissionsService.getContactFirms();
  }

  @Post('firms')
  createContactFirm(@Body() body: any) {
    return this.permissionsService.createContactFirm(body);
  }

  @Patch('firms/:id')
  updateContactFirm(@Param('id') id: string, @Body() body: any) {
    return this.permissionsService.updateContactFirm(id, body);
  }

  @Delete('firms/:id')
  deleteContactFirm(@Param('id') id: string) {
    return this.permissionsService.deleteContactFirm(id);
  }

  @Post('seed-firms')
  seedFirms() {
    return this.permissionsService.seedContactFirms();
  }
}
