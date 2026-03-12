import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface CreateAuditLogDto {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  description?: string;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
}

export interface AuditLogFilters {
  userId?: string;
  entity?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const entry = this.auditRepo.create(dto);
    return this.auditRepo.save(entry);
  }

  async findAll(filters: AuditLogFilters = {}): Promise<{ data: AuditLog[]; total: number }> {
    const qb = this.auditRepo.createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .orderBy('audit.createdAt', 'DESC');

    if (filters.userId) {
      qb.andWhere('audit.userId = :userId', { userId: filters.userId });
    }
    if (filters.entity) {
      qb.andWhere('audit.entity = :entity', { entity: filters.entity });
    }
    if (filters.entityId) {
      qb.andWhere('audit.entityId = :entityId', { entityId: filters.entityId });
    }
    if (filters.action) {
      qb.andWhere('audit.action = :action', { action: filters.action });
    }
    if (filters.from) {
      qb.andWhere('audit.createdAt >= :from', { from: filters.from });
    }
    if (filters.to) {
      qb.andWhere('audit.createdAt <= :to', { to: filters.to });
    }

    const total = await qb.getCount();

    if (filters.limit) {
      qb.take(filters.limit);
    } else {
      qb.take(50);
    }
    if (filters.offset) {
      qb.skip(filters.offset);
    }

    const data = await qb.getMany();

    return { data, total };
  }

  async getEntityHistory(entity: string, entityId: string): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { entity, entityId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getUserActivity(userId: string, limit = 50): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getRecentActivity(limit = 20): Promise<AuditLog[]> {
    return this.auditRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // Cleanup old audit logs (older than 6 months)
  async cleanupOldLogs(): Promise<number> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const result = await this.auditRepo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :date', { date: sixMonthsAgo })
      .execute();

    return result.affected || 0;
  }
}
