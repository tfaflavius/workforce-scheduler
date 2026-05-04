import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ControlNotesService } from './control-notes.service';
import { UpsertControlNoteDto } from './dto/upsert-control-note.dto';

@ApiTags('Control inspection notes')
@ApiBearerAuth('JWT')
@Controller('control-inspection-notes')
@UseGuards(JwtAuthGuard)
export class ControlNotesController {
  constructor(private readonly service: ControlNotesService) {}

  /**
   * Year matrix: every Control user with their 12 monthly counts +
   * working-day metadata + totals + per-day averages.
   * Anyone authenticated can view.
   */
  @Get()
  async getMatrix(
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    const target = year ?? new Date().getFullYear();
    return this.service.getMatrix(target);
  }

  /**
   * Set or update a single (user, year, month) cell.
   * Editing is restricted to Parcometre dept + Admin/Manager — enforced
   * inside the service via assertCanEdit().
   */
  @Put()
  async upsert(@Request() req, @Body() dto: UpsertControlNoteDto) {
    return this.service.upsert(req.user, dto);
  }

  /**
   * Clear a single cell.
   */
  @Delete(':userId/:year/:month')
  async deleteCell(
    @Request() req,
    @Param('userId') userId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.service.deleteCell(req.user, userId, year, month);
  }
}
