import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { InvestmentsService } from './investments.service';
import { UpsertAnnualBudgetDto } from './dto/upsert-annual-budget.dto';

@ApiTags('Investments')
@ApiBearerAuth('JWT')
@Controller('investments')
@UseGuards(JwtAuthGuard)
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  /**
   * Get metadata about the currently uploaded investment document.
   * Returns null when no document has been uploaded yet.
   */
  @Get('document')
  async getDocumentMetadata() {
    return this.investmentsService.getCurrentMetadata();
  }

  /**
   * Download / view the raw Excel file. The frontend uses this to feed the
   * file bytes into SheetJS for in-app rendering, and also as the source for
   * a "Download" button in the UI.
   */
  @Get('document/file')
  async downloadDocument(@Res() res: Response): Promise<void> {
    const doc = await this.investmentsService.getCurrentFile();
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
    );
    res.setHeader('Content-Length', String(doc.fileSize));
    res.send(doc.fileData);
  }

  /**
   * Upload a new Excel file. Replaces the existing document.
   * Restricted to ADMIN, MASTER_ADMIN and MANAGER roles.
   */
  @Post('document/upload')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Request() req,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    return this.investmentsService.upload(req.user.id, file);
  }

  // ===== Annual investment budget envelope =====

  /**
   * Get the yearly investment budget summary (envelope + allocations + remainders).
   * Anyone with auth can view.
   */
  @Get('annual-budget')
  async getAnnualBudget(
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    const targetYear = year ?? new Date().getFullYear();
    return this.investmentsService.getAnnualBudget(targetYear);
  }

  /**
   * Set / update the yearly investment envelope. Admin + Manager only.
   */
  @Put('annual-budget')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async upsertAnnualBudget(@Request() req, @Body() dto: UpsertAnnualBudgetDto) {
    return this.investmentsService.upsertAnnualBudget(req.user.id, dto);
  }
}
