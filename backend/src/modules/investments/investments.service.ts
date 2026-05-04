import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvestmentDocument } from './entities/investment-document.entity';

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

@Injectable()
export class InvestmentsService {
  private readonly logger = new Logger(InvestmentsService.name);

  constructor(
    @InjectRepository(InvestmentDocument)
    private readonly documentRepository: Repository<InvestmentDocument>,
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
}
