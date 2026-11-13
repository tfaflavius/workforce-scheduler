import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable, tap } from 'rxjs';
import { MoreThan, Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { managerDeptScope } from '../../common/utils/manager-scope';
import { describeActivity } from './team-activity.rules';

/** Aceeasi actiune repetata de acelasi om nu se mai anunta timp de 10 minute. */
const REPEAT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Dupa fiecare actiune reusita a unui angajat (rol USER), anunta managerii care
 * controleaza departamentul lui: managerul departamentului, managerii alocati pe acel
 * departament si managerii pe "toate departamentele". In-app + push, fara email.
 */
@Injectable()
export class TeamActivityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TeamActivityInterceptor.name);
  /** Ultima data cand s-a anuntat fiecare actiune (prinde si repetarile foarte rapide). */
  private readonly lastSent = new Map<string, number>();

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    private readonly notifications: NotificationsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const actor = req.user as User | undefined;
    const activity =
      actor?.role === UserRole.USER && req.route?.path
        ? describeActivity(req.method, req.route.path)
        : null;
    if (!activity) return next.handle();
    return next.handle().pipe(
      tap(() => {
        this.notifyManagers(actor!, activity.text, activity.url).catch((err) =>
          this.logger.warn(`Team activity notification failed: ${err?.message}`),
        );
      }),
    );
  }

  async notifyManagers(actor: User, text: string, url: string | null): Promise<number> {
    if (!actor.departmentId) return 0;
    const [dept, managers] = await Promise.all([
      this.deptRepo.findOne({ where: { id: actor.departmentId } }),
      this.userRepo.find({ where: { role: UserRole.MANAGER, isActive: true } }),
    ]);
    const ids = new Set<string>();
    for (const m of managers) {
      const scope = managerDeptScope(m);
      if (!scope || scope.includes(actor.departmentId) || dept?.managerId === m.id) ids.add(m.id);
    }
    ids.delete(actor.id);
    if (ids.size === 0) return 0;

    const message = `${actor.fullName}${dept ? ` (${dept.name})` : ''} ${text}.`;
    const key = `${actor.id}:${message}`;
    const now = Date.now();
    if (now - (this.lastSent.get(key) || 0) < REPEAT_WINDOW_MS) return 0;
    this.lastSent.set(key, now);
    if (this.lastSent.size > 5000) {
      for (const [k, t] of this.lastSent) if (now - t > REPEAT_WINDOW_MS) this.lastSent.delete(k);
    }
    // Anti-spam: fara dubluri pentru aceeasi actiune repetata in ultimele 10 minute
    const recent = await this.notifRepo.find({
      where: {
        type: NotificationType.TEAM_ACTIVITY,
        message,
        createdAt: MoreThan(new Date(Date.now() - REPEAT_WINDOW_MS)),
      },
      select: ['userId'],
    });
    recent.forEach((n) => ids.delete(n.userId));
    if (ids.size === 0) return 0;

    await this.notifications.createMany(
      [...ids].map((userId) => ({
        userId,
        type: NotificationType.TEAM_ACTIVITY,
        title: `Activitate: ${actor.fullName}`,
        message,
        data: { actorId: actor.id, departmentId: actor.departmentId, url },
        skipEmail: true,
      })),
    );
    return ids.size;
  }
}
