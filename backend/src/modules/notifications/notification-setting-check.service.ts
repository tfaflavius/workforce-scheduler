import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSetting } from '../permissions/entities/notification-setting.entity';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class NotificationSettingCheckService {
  private readonly logger = new Logger(NotificationSettingCheckService.name);
  // In-memory cache to avoid DB hits on every notification
  private cache: Map<string, { inApp: boolean; push: boolean }> | null = null;
  private cacheLoadedAt = 0;
  private readonly CACHE_TTL_MS = 60_000; // 1 minute

  constructor(
    @InjectRepository(NotificationSetting)
    private readonly settingRepo: Repository<NotificationSetting>,
  ) {}

  private cacheKey(type: string, role: UserRole): string {
    return `${type}:${role}`;
  }

  private async loadCache(): Promise<void> {
    const settings = await this.settingRepo.find();
    const map = new Map<string, { inApp: boolean; push: boolean }>();
    for (const s of settings) {
      map.set(this.cacheKey(s.notificationType, s.role as UserRole), {
        inApp: s.inAppEnabled,
        push: s.pushEnabled,
      });
    }
    this.cache = map;
    this.cacheLoadedAt = Date.now();
    this.logger.debug(`Loaded ${settings.length} notification settings into cache`);
  }

  private async ensureCache(): Promise<Map<string, { inApp: boolean; push: boolean }>> {
    if (!this.cache || Date.now() - this.cacheLoadedAt > this.CACHE_TTL_MS) {
      await this.loadCache();
    }
    return this.cache!;
  }

  async isInAppEnabled(type: string, role: UserRole): Promise<boolean> {
    const cache = await this.ensureCache();
    const entry = cache.get(this.cacheKey(type, role));
    // If no setting found, default to enabled (safe fallback)
    return entry?.inApp ?? true;
  }

  async isPushEnabled(type: string, role: UserRole): Promise<boolean> {
    const cache = await this.ensureCache();
    const entry = cache.get(this.cacheKey(type, role));
    return entry?.push ?? true;
  }

  invalidateCache(): void {
    this.cache = null;
  }
}
