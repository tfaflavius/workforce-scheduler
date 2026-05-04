import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvestmentDocument } from './entities/investment-document.entity';
import { InvestmentAnnualBudget } from './entities/investment-annual-budget.entity';
import { InvestmentAnnualBudgetHistory } from './entities/investment-annual-budget-history.entity';
import { BudgetPosition } from '../acquisitions/entities/budget-position.entity';
import { UpsertAnnualBudgetDto } from './dto/upsert-annual-budget.dto';

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls (legacy)
  'application/octet-stream', // some clients send this
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface InvestmentDocumentMetadata {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: { id: string; fullName: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvestmentAnnualBudgetSummary {
  year: number;
  totalAmount: number;       // user-set yearly investment envelope
  allocatedToPositions: number; // sum of INVESTMENT budget positions' totalAmount
  spentOnAcquisitions: number; // sum of acquisitions values across investments
  remainingInPositions: number; // allocated - spent (already on positions, not yet on acquisitions)
  availableForNewPositions: number; // totalAmount - allocatedToPositions
  notes: string | null;
  lastModifiedBy: { id: string; fullName: string } | null;
  updatedAt: Date | null;
}

@Injectable()
export class InvestmentsService {
  private readonly logger = new Logger(InvestmentsService.name);

  constructor(
    @InjectRepository(InvestmentDocument)
    private readonly documentRepository: Repository<InvestmentDocument>,
    @InjectRepository(InvestmentAnnualBudget)
    private readonly annualBudgetRepository: Repository<InvestmentAnnualBudget>,
    @InjectRepository(InvestmentAnnualBudgetHistory)
    private readonly annualBudgetHistoryRepository: Repository<InvestmentAnnualBudgetHistory>,
    @InjectRepository(BudgetPosition)
    private readonly budgetPositionRepository: Repository<BudgetPosition>,
  ) {}

  /**
   * Returns metadata about the current investment document (without the binary
   * payload, so listing endpoints stay fast).
   */
  async getCurrentMetadata(): Promise<InvestmentDocumentMetadata | null> {
    const doc = await this.documentRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.uploadedBy', 'uploadedBy')
      .orderBy('doc.updatedAt', 'DESC')
      .limit(1)
      .getOne();

    if (!doc) return null;

    return {
      id: doc.id,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      uploadedBy: doc.uploadedBy
        ? { id: doc.uploadedBy.id, fullName: doc.uploadedBy.fullName }
        : null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  /**
   * Returns the raw file bytes + metadata, used by the download/preview endpoint.
   */
  async getCurrentFile(): Promise<InvestmentDocument> {
    const doc = await this.documentRepository
      .createQueryBuilder('doc')
      .orderBy('doc.updatedAt', 'DESC')
      .limit(1)
      .getOne();

    if (!doc) {
      throw new NotFoundException('Nu exista niciun document de investitii incarcat');
    }

    return doc;
  }

  /**
   * Replace the existing document (or create the first one) with the uploaded file.
   * The file is stored verbatim — the client parses it for display, so the
   * original spreadsheet is preserved 1:1.
   */
  async upload(
    userId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ): Promise<InvestmentDocumentMetadata> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Fisierul este obligatoriu');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `Fisierul depaseste dimensiunea maxima permisa (${Math.floor(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB)`,
      );
    }

    const filename = (file.originalname || 'document.xlsx').toLowerCase();
    const isXlsx = filename.endsWith('.xlsx') || filename.endsWith('.xls');
    const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
    if (!isXlsx && !mimeOk) {
      throw new BadRequestException('Doar fisiere Excel (.xlsx, .xls) sunt acceptate');
    }

    // Replace the existing single row (delete-all-then-insert).
    // Keeping a single source of truth means re-uploads simply overwrite.
    await this.documentRepository.clear();

    const doc = this.documentRepository.create({
      fileName: file.originalname || 'document.xlsx',
      mimeType: file.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileSize: file.size,
      fileData: file.buffer,
      uploadedById: userId,
    });

    const saved = await this.documentRepository.save(doc);
    this.logger.log(`Investment document uploaded by ${userId}: ${file.originalname} (${file.size} bytes)`);

    // Reload with relation to return full metadata
    const reloaded = await this.documentRepository.findOne({
      where: { id: saved.id },
      relations: ['uploadedBy'],
    });

    return {
      id: reloaded.id,
      fileName: reloaded.fileName,
      mimeType: reloaded.mimeType,
      fileSize: reloaded.fileSize,
      uploadedBy: reloaded.uploadedBy
        ? { id: reloaded.uploadedBy.id, fullName: reloaded.uploadedBy.fullName }
        : null,
      createdAt: reloaded.createdAt,
      updatedAt: reloaded.updatedAt,
    };
  }

  // ===== Annual investment budget envelope =====

  /**
   * Returns the yearly investment envelope + all its derived breakdowns
   * (allocated to positions, spent on acquisitions, available for new positions).
   * If no row exists for the year, returns zeros — the UI then prompts the user
   * to set the total.
   */
  async getAnnualBudget(year: number): Promise<InvestmentAnnualBudgetSummary> {
    const budget = await this.annualBudgetRepository.findOne({
      where: { year },
      relations: ['lastModifiedBy'],
    });

    // Pull all INVESTMENTS positions for this year and their acquisitions so
    // we can compute the allocations without a second round-trip.
    const positions = await this.budgetPositionRepository.find({
      where: { year, category: 'INVESTMENTS' },
      relations: ['acquisitions'],
    });

    const allocatedToPositions = positions.reduce(
      (s, p) => s + Number(p.totalAmount || 0),
      0,
    );
    const spentOnAcquisitions = positions.reduce(
      (s, p) =>
        s + (p.acquisitions || []).reduce((acc, a) => acc + Number(a.value || 0), 0),
      0,
    );
    const remainingInPositions = allocatedToPositions - spentOnAcquisitions;
    const totalAmount = budget ? Number(budget.totalAmount) : 0;
    const availableForNewPositions = totalAmount - allocatedToPositions;

    return {
      year,
      totalAmount,
      allocatedToPositions: Math.round(allocatedToPositions * 100) / 100,
      spentOnAcquisitions: Math.round(spentOnAcquisitions * 100) / 100,
      remainingInPositions: Math.round(remainingInPositions * 100) / 100,
      availableForNewPositions: Math.round(availableForNewPositions * 100) / 100,
      notes: budget?.notes ?? null,
      lastModifiedBy: budget?.lastModifiedBy
        ? { id: budget.lastModifiedBy.id, fullName: budget.lastModifiedBy.fullName }
        : null,
      updatedAt: budget?.updatedAt ?? null,
    };
  }

  /**
   * Set / update the yearly investment envelope (one row per year).
   * Restricted via controller-level role guard.
   */
  async upsertAnnualBudget(
    userId: string,
    dto: UpsertAnnualBudgetDto,
  ): Promise<InvestmentAnnualBudgetSummary> {
    const existing = await this.annualBudgetRepository.findOne({
      where: { year: dto.year },
    });

    const oldAmount = existing ? Number(existing.totalAmount) : null;
    const oldNotes = existing?.notes ?? null;

    if (existing) {
      existing.totalAmount = dto.totalAmount;
      existing.notes = dto.notes ?? null;
      existing.lastModifiedById = userId;
      await this.annualBudgetRepository.save(existing);
    } else {
      const created = this.annualBudgetRepository.create({
        year: dto.year,
        totalAmount: dto.totalAmount,
        notes: dto.notes ?? null,
        lastModifiedById: userId,
      });
      await this.annualBudgetRepository.save(created);
    }

    // Record history only when something actually changed (skip identical re-saves)
    const changed =
      oldAmount === null ||
      Number(oldAmount) !== Number(dto.totalAmount) ||
      (oldNotes ?? '') !== (dto.notes ?? '');
    if (changed) {
      const historyRow = this.annualBudgetHistoryRepository.create({
        year: dto.year,
        oldAmount,
        newAmount: dto.totalAmount,
        oldNotes,
        newNotes: dto.notes ?? null,
        changedById: userId,
      });
      await this.annualBudgetHistoryRepository.save(historyRow);
    }

    this.logger.log(
      `Annual investment budget for ${dto.year} set to ${dto.totalAmount} by ${userId}`,
    );
    return this.getAnnualBudget(dto.year);
  }

  /**
   * Returns the change history for a specific year, newest first.
   */
  async getAnnualBudgetHistory(year: number): Promise<Array<{
    id: string;
    year: number;
    oldAmount: number | null;
    newAmount: number;
    oldNotes: string | null;
    newNotes: string | null;
    changedBy: { id: string; fullName: string } | null;
    createdAt: Date;
  }>> {
    const rows = await this.annualBudgetHistoryRepository.find({
      where: { year },
      relations: ['changedBy'],
      order: { createdAt: 'DESC' },
    });
    return rows.map(r => ({
      id: r.id,
      year: r.year,
      oldAmount: r.oldAmount !== null ? Number(r.oldAmount) : null,
      newAmount: Number(r.newAmount),
      oldNotes: r.oldNotes,
      newNotes: r.newNotes,
      changedBy: r.changedBy
        ? { id: r.changedBy.id, fullName: r.changedBy.fullName }
        : null,
      createdAt: r.createdAt,
    }));
  }
}
