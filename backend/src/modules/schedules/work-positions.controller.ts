import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WorkPositionsService } from './work-positions.service';
import { CreateWorkPositionDto, UpdateWorkPositionDto } from './dto/work-position.dto';
import { WorkPosition } from './entities/work-position.entity';
import { UserRole } from '../users/entities/user.entity';

@Controller('work-positions')
@UseGuards(JwtAuthGuard)
export class WorkPositionsController {
  constructor(private readonly workPositionsService: WorkPositionsService) {}

  @Get()
  async findAll(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<WorkPosition[]> {
    return this.workPositionsService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<WorkPosition> {
    return this.workPositionsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createDto: CreateWorkPositionDto): Promise<WorkPosition> {
    return this.workPositionsService.create(createDto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateWorkPositionDto,
  ): Promise<WorkPosition> {
    return this.workPositionsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.workPositionsService.remove(id);
  }
}
