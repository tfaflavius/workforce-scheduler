import { managerDeptScope } from '../../common/utils/manager-scope';
import { chatAudienceNames } from './chat-routing';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { ChatConversation, ChatMessage, ChatRead } from './entities/chat.entities';
import { User, UserRole } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';

type Requester = { id: string; role: string };

const ADMIN_ROLES: string[] = [UserRole.ADMIN, UserRole.MASTER_ADMIN];
const ANNOUNCERS: string[] = [UserRole.MANAGER, UserRole.ADMIN, UserRole.MASTER_ADMIN];
const PAGE_SIZE = 100;

/** Mesajele care apar in grupul unui departament (alias-ul mesajului: m, al grupului: c). */
const DEPT_FEED_SQL = `(m.audience_dept_ids @> jsonb_build_array(c.department_id::text)
  OR (m.audience_dept_ids IS NULL AND m.conversation_id = c.id))`;

export interface ComposeInfo {
  multi: boolean;
  options: Array<{ id: string; name: string }>;
  defaultTargetIds: string[];
}

export interface ConversationSummary {
  id: string;
  type: ChatConversation['type'];
  title: string;
  subtitle?: string;
  otherUserId?: string;
  canWrite: boolean;
  lastMessage?: { text: string; userName: string; userId: string; createdAt: Date };
  lastMessageAt: Date | null;
  unreadCount: number;
}

/**
 * Chat-ul aplicatiei:
 *  - mesaje private intre oricare doi oameni;
 *  - un grup automat pe fiecare departament (membrii departamentului + managerul lui;
 *    adminii pot intra in toate);
 *  - canalul de anunturi: il citeste toata lumea, scriu doar managerii si adminii.
 * Notificari: in-app + push, fara email, cel mult una necitita pe conversatie si om.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatConversation)
    private readonly convRepo: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private readonly msgRepo: Repository<ChatMessage>,
    @InjectRepository(ChatRead)
    private readonly readRepo: Repository<ChatRead>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ============== HELPERS ==============

  private isAdmin(u: { role: string }) {
    return ADMIN_ROLES.includes(u.role);
  }

  private async loadMe(requester: Requester): Promise<User> {
    const me = await this.userRepo.findOne({
      where: { id: requester.id },
      relations: ['department'],
    });
    if (!me || !me.isActive) throw new ForbiddenException();
    return me;
  }

  private directKey(a: string, b: string) {
    return [a, b].sort().join(':');
  }

  private async ensureAnnouncements(): Promise<ChatConversation> {
    let conv = await this.convRepo.findOne({ where: { type: 'ANNOUNCEMENTS' } });
    if (!conv) {
      await this.convRepo
        .createQueryBuilder()
        .insert()
        .into(ChatConversation)
        .values({ type: 'ANNOUNCEMENTS' })
        .orIgnore()
        .execute();
      conv = await this.convRepo.findOne({ where: { type: 'ANNOUNCEMENTS' } });
    }
    return conv!;
  }

  private async ensureDepartmentConversations(deptIds: string[]): Promise<ChatConversation[]> {
    if (deptIds.length === 0) return [];
    const existing = await this.convRepo.find({ where: { departmentId: In(deptIds) } });
    const missing = deptIds.filter((id) => !existing.some((c) => c.departmentId === id));
    for (const departmentId of missing) {
      await this.convRepo
        .createQueryBuilder()
        .insert()
        .into(ChatConversation)
        .values({ type: 'DEPARTMENT', departmentId })
        .orIgnore()
        .execute();
    }
    return missing.length ? this.convRepo.find({ where: { departmentId: In(deptIds) } }) : existing;
  }

  /** Departamentele ale caror grupuri le vede omul. */
  private async visibleDepartmentIds(me: User): Promise<string[]> {
    // Managerul pe "toate departamentele" vede toate grupurile, ca adminul
    const allDepts = this.isAdmin(me) || (me.role === UserRole.MANAGER && !managerDeptScope(me));
    if (allDepts) {
      const rows = await this.deptRepo
        .createQueryBuilder('d')
        .innerJoin(User, 'u', 'u.departmentId = d.id AND u.isActive = true')
        .select('d.id', 'id')
        .groupBy('d.id')
        .getRawMany();
      return rows.map((r) => r.id);
    }
    const ids = new Set<string>();
    if (me.departmentId) ids.add(me.departmentId);
    const managed = await this.deptRepo.find({ where: { managerId: me.id }, select: ['id'] });
    managed.forEach((d) => ids.add(d.id));
    (managerDeptScope(me) || []).forEach((d) => ids.add(d));
    return [...ids];
  }

  /** Verifica accesul la o conversatie si daca omul poate scrie in ea. */
  private async access(
    conv: ChatConversation,
    me: User,
  ): Promise<{ canRead: boolean; canWrite: boolean }> {
    if (conv.type === 'ANNOUNCEMENTS') {
      return { canRead: true, canWrite: ANNOUNCERS.includes(me.role) };
    }
    if (conv.type === 'DIRECT') {
      const ok = !!conv.directKey?.split(':').includes(me.id);
      return { canRead: ok, canWrite: ok };
    }
    if (this.isAdmin(me)) return { canRead: true, canWrite: true };
    const visible = await this.visibleDepartmentIds(me);
    const ok = !!conv.departmentId && visible.includes(conv.departmentId);
    return { canRead: ok, canWrite: ok };
  }

  private async getConversationOrFail(id: string): Promise<ChatConversation> {
    const conv = await this.convRepo.findOne({ where: { id } });
    if (!conv) throw new NotFoundException('Conversatia nu a fost gasita');
    return conv;
  }

  /** Cine primeste notificare / e membru (fara autor). */
  private async recipientsOf(conv: ChatConversation, authorId: string): Promise<string[]> {
    let ids: string[] = [];
    if (conv.type === 'DIRECT') {
      ids = conv.directKey!.split(':');
    } else if (conv.type === 'DEPARTMENT') {
      const dept = await this.deptRepo.findOne({ where: { id: conv.departmentId! } });
      const users = await this.userRepo.find({
        where: { departmentId: conv.departmentId!, isActive: true },
        select: ['id'],
      });
      ids = users.map((u) => u.id);
      if (dept?.managerId) ids.push(dept.managerId);
      // + managerii care au departamentul alocat explicit
      const managers = await this.userRepo.find({
        where: { role: UserRole.MANAGER, isActive: true },
      });
      for (const m of managers) {
        if ((managerDeptScope(m) || []).includes(conv.departmentId!)) ids.push(m.id);
      }
    } else {
      const users = await this.userRepo.find({ where: { isActive: true }, select: ['id'] });
      ids = users.map((u) => u.id);
    }
    return [...new Set(ids)].filter((id) => id !== authorId);
  }

  // ============== LISTA CONVERSATII ==============

  async listConversations(requester: Requester): Promise<ConversationSummary[]> {
    const me = await this.loadMe(requester);
    const announcements = await this.ensureAnnouncements();
    const deptConvs = await this.ensureDepartmentConversations(await this.visibleDepartmentIds(me));
    const directs = await this.convRepo
      .createQueryBuilder('c')
      .where("c.type = 'DIRECT'")
      .andWhere('(c.directKey LIKE :a OR c.directKey LIKE :b)', {
        a: `${me.id}:%`,
        b: `%:${me.id}`,
      })
      .andWhere('c.lastMessageAt IS NOT NULL')
      .getMany();

    const convs = [announcements, ...deptConvs, ...directs];
    const ids = convs.map((c) => c.id);

    // Ultimul mesaj si necititele. Grupurile de departament arata toate mesajele
    // care le privesc (si cele trimise din alte departamente catre ele).
    const deptIds = deptConvs.map((c) => c.id);
    const otherConvIds = ids.filter((id) => !deptIds.includes(id));
    type LastRow = {
      conversation_id: string;
      message: string;
      user_id: string;
      created_at: Date;
      full_name: string;
    };
    const lastRows: LastRow[] = [
      ...(await this.msgRepo.query(
        `SELECT DISTINCT ON (m.conversation_id) m.conversation_id, m.message, m.user_id, m.created_at, u.full_name
           FROM chat_messages m JOIN users u ON u.id = m.user_id
           WHERE m.conversation_id = ANY($1)
           ORDER BY m.conversation_id, m.created_at DESC`,
        [otherConvIds],
      )),
      ...(deptIds.length
        ? await this.msgRepo.query(
            `SELECT c.id AS conversation_id, lm.message, lm.user_id, lm.created_at, lm.full_name
               FROM chat_conversations c
               CROSS JOIN LATERAL (
                 SELECT m.message, m.user_id, m.created_at, u.full_name
                   FROM chat_messages m JOIN users u ON u.id = m.user_id
                  WHERE ${DEPT_FEED_SQL}
                  ORDER BY m.created_at DESC LIMIT 1) lm
              WHERE c.id = ANY($1)`,
            [deptIds],
          )
        : []),
    ];
    const lastMap = new Map(lastRows.map((r) => [r.conversation_id, r]));

    // Necitite: mesajele altora de dupa ultima citire
    const unreadRows: Array<{ conversation_id: string; c: string }> = [
      ...(await this.msgRepo.query(
        `SELECT m.conversation_id, COUNT(*)::int AS c
         FROM chat_messages m
         LEFT JOIN chat_reads r ON r.conversation_id = m.conversation_id AND r.user_id = $2
         WHERE m.conversation_id = ANY($1) AND m.user_id <> $2
           AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)
         GROUP BY m.conversation_id`,
        [otherConvIds, me.id],
      )),
      ...(deptIds.length
        ? await this.msgRepo.query(
            `SELECT c.id AS conversation_id,
                    (SELECT COUNT(*)::int FROM chat_messages m
                      WHERE ${DEPT_FEED_SQL} AND m.user_id <> $2
                        AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)) AS c
               FROM chat_conversations c
               LEFT JOIN chat_reads r ON r.conversation_id = c.id AND r.user_id = $2
              WHERE c.id = ANY($1)`,
            [deptIds, me.id],
          )
        : []),
    ];
    const unreadMap = new Map(unreadRows.map((r) => [r.conversation_id, Number(r.c)]));

    // Nume pentru titluri
    const otherIds = directs.map((c) => c.directKey!.split(':').find((id) => id !== me.id)!);
    const others = otherIds.length
      ? await this.userRepo.find({ where: { id: In(otherIds) }, relations: ['department'] })
      : [];
    const otherMap = new Map(others.map((u) => [u.id, u]));
    const depts = deptConvs.length
      ? await this.deptRepo.find({ where: { id: In(deptConvs.map((c) => c.departmentId!)) } })
      : [];
    const deptName = new Map(depts.map((d) => [d.id, d.name]));

    const summaries: ConversationSummary[] = convs.map((c) => {
      const last = lastMap.get(c.id);
      let title = 'Anunturi';
      let subtitle: string | undefined = 'Pentru toata lumea';
      let otherUserId: string | undefined;
      let canWrite = ANNOUNCERS.includes(me.role);
      if (c.type === 'DEPARTMENT') {
        title = deptName.get(c.departmentId!) || 'Departament';
        subtitle = 'Grupul departamentului';
        canWrite = true;
      } else if (c.type === 'DIRECT') {
        otherUserId = c.directKey!.split(':').find((id) => id !== me.id);
        const other = otherMap.get(otherUserId!);
        title = other?.fullName || 'Utilizator';
        subtitle = other?.department?.name || undefined;
        canWrite = true;
      }
      return {
        id: c.id,
        type: c.type,
        title,
        subtitle,
        otherUserId,
        canWrite,
        lastMessage: last
          ? {
              text: last.message,
              userName: last.full_name,
              userId: last.user_id,
              createdAt: last.created_at,
            }
          : undefined,
        lastMessageAt: last?.created_at ?? c.lastMessageAt,
        unreadCount: unreadMap.get(c.id) || 0,
      };
    });

    // Anunturile primele, apoi dupa ultimul mesaj
    const order = { ANNOUNCEMENTS: 0, DEPARTMENT: 1, DIRECT: 1 } as const;
    return summaries.sort(
      (a, b) =>
        order[a.type] - order[b.type] ||
        new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime() ||
        a.title.localeCompare(b.title),
    );
  }

  async unreadTotal(requester: Requester) {
    const list = await this.listConversations(requester);
    return { count: list.reduce((s, c) => s + c.unreadCount, 0) };
  }

  // ============== MESAJE ==============

  async getMessages(conversationId: string, requester: Requester, before?: string) {
    const me = await this.loadMe(requester);
    const conv = await this.getConversationOrFail(conversationId);
    const { canRead, canWrite } = await this.access(conv, me);
    if (!canRead) throw new ForbiddenException('Nu ai acces la aceasta conversatie');

    let rows: ChatMessage[];
    if (conv.type === 'DEPARTMENT') {
      const qb = this.msgRepo
        .createQueryBuilder('m')
        .leftJoinAndSelect('m.user', 'user')
        .leftJoinAndSelect('user.department', 'userDept')
        .innerJoin(ChatConversation, 'c', 'c.id = :cid', { cid: conv.id })
        .where(DEPT_FEED_SQL)
        .orderBy('m.createdAt', 'DESC')
        .take(PAGE_SIZE);
      if (before) qb.andWhere('m.createdAt < :before', { before: new Date(before) });
      rows = await qb.getMany();
    } else {
      rows = await this.msgRepo.find({
        where: { conversationId, ...(before ? { createdAt: LessThan(new Date(before)) } : {}) },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        take: PAGE_SIZE,
      });
    }
    if (!before) await this.markRead(conversationId, me.id);

    // Etichete "De la -> Catre" pentru mesajele din grupuri
    const deptName = new Map<string, string>();
    if (conv.type === 'DEPARTMENT') {
      (await this.deptRepo.find({ select: ['id', 'name'] })).forEach((d) =>
        deptName.set(d.id, d.name),
      );
    }
    const names = (ids: string[] | null) =>
      (ids || []).map((id) => deptName.get(id)).filter((n): n is string => !!n);

    return {
      canWrite,
      hasMore: rows.length === PAGE_SIZE,
      compose: conv.type === 'DEPARTMENT' && canWrite ? await this.composeInfo(me, conv) : null,
      messages: rows.reverse().map((m) => {
        const routed = conv.type === 'DEPARTMENT' && !!m.targetDeptIds?.length;
        const to = routed ? names(m.targetDeptIds) : [];
        const fromName = m.user?.department?.name || null;
        return {
          id: m.id,
          userId: m.userId,
          userName: m.user?.fullName || 'Utilizator',
          userRole: m.user?.role,
          message: m.message,
          createdAt: m.createdAt,
          ...(routed
            ? {
                fromDepartment: fromName,
                toDepartments: to,
                alsoVisibleTo: names(m.audienceDeptIds).filter(
                  (n) => !to.includes(n) && n !== fromName,
                ),
              }
            : {}),
        };
      }),
    };
  }

  /** Catre ce departamente poate trimite omul din grupul de departament. */
  private async composeInfo(me: User, conv: ChatConversation): Promise<ComposeInfo> {
    const all = await this.deptRepo.find({ select: ['id', 'name'], order: { name: 'ASC' } });
    const management = this.isAdmin(me) || me.role === UserRole.MANAGER;
    const scope = managerDeptScope(me);
    const options = (scope ? all.filter((d) => scope.includes(d.id)) : all).map((d) => ({
      id: d.id,
      name: d.name,
    }));
    const def = options.some((o) => o.id === conv.departmentId) ? [conv.departmentId!] : [];
    return { multi: management, options, defaultTargetIds: def };
  }

  /** Departamentele care vad mesajul (dupa regulile din chat-routing). */
  private async computeAudience(me: User, targetIds: string[]): Promise<string[]> {
    const depts = await this.deptRepo.find({ select: ['id', 'name'] });
    const byId = new Map(depts.map((d) => [d.id, d.name]));
    const byName = new Map(depts.map((d) => [d.name, d.id]));
    const management = this.isAdmin(me) || me.role === UserRole.MANAGER;
    const from = management ? null : byId.get(me.departmentId || '') || null;
    const aud = new Set<string>();
    for (const t of targetIds) {
      const name = byId.get(t);
      if (!name) continue;
      for (const n of chatAudienceNames(from, name)) {
        const id = byName.get(n);
        if (id) aud.add(id);
      }
    }
    return [...aud];
  }

  private async markRead(conversationId: string, userId: string) {
    await this.readRepo
      .createQueryBuilder()
      .insert()
      .into(ChatRead)
      .values({ conversationId, userId, lastReadAt: new Date() })
      .orUpdate(['last_read_at'], ['conversation_id', 'user_id'])
      .execute();
    await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: () => 'CURRENT_TIMESTAMP' } as any)
      .where('user_id = :userId AND type = :type AND is_read = false', {
        userId,
        type: NotificationType.CHAT_MESSAGE,
      })
      .andWhere("data->>'conversationId' = :conversationId", { conversationId })
      .execute()
      .catch((err) => this.logger.warn(`Mark chat notifications read failed: ${err?.message}`));
  }

  async sendMessage(
    conversationId: string,
    text: string,
    requester: Requester,
    targetDepartmentIds?: string[],
  ) {
    const me = await this.loadMe(requester);
    const conv = await this.getConversationOrFail(conversationId);
    const { canWrite } = await this.access(conv, me);
    if (!canWrite) {
      throw new ForbiddenException(
        conv.type === 'ANNOUNCEMENTS'
          ? 'Doar managerii si adminii pot scrie in Anunturi'
          : 'Nu ai acces la aceasta conversatie',
      );
    }
    const clean = (text || '').trim();
    if (!clean) throw new BadRequestException('Mesajul este gol');

    if (conv.type === 'DEPARTMENT') {
      const compose = await this.composeInfo(me, conv);
      const allowed = new Set(compose.options.map((o) => o.id));
      const targets = [
        ...new Set(targetDepartmentIds?.length ? targetDepartmentIds : compose.defaultTargetIds),
      ];
      if (targets.length === 0) throw new BadRequestException('Alege departamentul');
      if (!compose.multi && targets.length > 1) {
        throw new BadRequestException('Poti trimite catre un singur departament');
      }
      if (targets.some((t) => !allowed.has(t))) {
        throw new ForbiddenException('Nu poti trimite catre acest departament');
      }
      const audience = await this.computeAudience(me, targets);
      const now = new Date();
      await this.msgRepo.save(
        this.msgRepo.create({
          conversationId,
          userId: me.id,
          message: clean,
          targetDeptIds: targets,
          audienceDeptIds: audience,
        }),
      );
      const convs = await this.ensureDepartmentConversations(audience);
      if (convs.length) {
        await this.convRepo.update({ id: In(convs.map((c) => c.id)) }, { lastMessageAt: now });
      }
      this.notifyDepartments(me, clean, targets, audience, convs).catch((err) =>
        this.logger.warn(`Chat notification failed: ${err?.message}`),
      );
      return this.getMessages(conversationId, requester);
    }

    await this.msgRepo.save(this.msgRepo.create({ conversationId, userId: me.id, message: clean }));
    conv.lastMessageAt = new Date();
    await this.convRepo.save(conv);

    this.notify(conv, me, clean).catch((err) =>
      this.logger.warn(`Chat notification failed: ${err?.message}`),
    );
    return this.getMessages(conversationId, requester);
  }

  private async notify(conv: ChatConversation, author: User, text: string) {
    const ids = await this.recipientsOf(conv, author.id);
    if (ids.length === 0) return;
    const alreadyUnread = await this.notificationRepo
      .createQueryBuilder('n')
      .select('n.userId', 'userId')
      .where('n.userId IN (:...ids)', { ids })
      .andWhere('n.type = :type', { type: NotificationType.CHAT_MESSAGE })
      .andWhere('n.isRead = false')
      .andWhere("n.data->>'conversationId' = :cid", { cid: conv.id })
      .getRawMany();
    const skip = new Set(alreadyUnread.map((r) => r.userId));
    const targets = ids.filter((id) => !skip.has(id));
    if (targets.length === 0) return;

    let where = 'Mesaj privat';
    if (conv.type === 'ANNOUNCEMENTS') where = 'Anunt nou';
    if (conv.type === 'DEPARTMENT') {
      const dept = await this.deptRepo.findOne({ where: { id: conv.departmentId! } });
      where = `Mesaj in ${dept?.name || 'departament'}`;
    }
    const preview = text.length > 120 ? `${text.slice(0, 117)}...` : text;
    await this.notificationsService.createMany(
      targets.map((userId) => ({
        userId,
        type: NotificationType.CHAT_MESSAGE,
        title: conv.type === 'DIRECT' ? `${author.fullName}` : where,
        message: conv.type === 'DIRECT' ? preview : `${author.fullName}: ${preview}`,
        data: { conversationId: conv.id, url: '/chat' },
        skipEmail: true,
      })),
    );
  }

  /**
   * Notifica departamentele care vad mesajul: angajatii lor, managerul departamentului si
   * managerii care au departamentul alocat. Fiecare primeste notificarea pe grupul pe care
   * il deschide (al departamentului sau), cel mult una necitita pe grup.
   */
  private async notifyDepartments(
    author: User,
    text: string,
    targets: string[],
    audience: string[],
    convs: ChatConversation[],
  ) {
    const convOf = new Map(convs.map((c) => [c.departmentId!, c.id]));
    const recipient = new Map<string, string>(); // userId -> conversationId
    const users = await this.userRepo.find({
      where: { departmentId: In(audience), isActive: true },
      select: ['id', 'departmentId'],
    });
    for (const u of users) recipient.set(u.id, convOf.get(u.departmentId!)!);
    const depts = await this.deptRepo.find({ where: { id: In(audience) } });
    for (const d of depts) {
      if (d.managerId && !recipient.has(d.managerId)) recipient.set(d.managerId, convOf.get(d.id)!);
    }
    const managers = await this.userRepo.find({
      where: { role: UserRole.MANAGER, isActive: true },
    });
    for (const m of managers) {
      const hit = (managerDeptScope(m) || []).find((d) => audience.includes(d));
      if (hit && !recipient.has(m.id)) recipient.set(m.id, convOf.get(hit)!);
    }
    recipient.delete(author.id);
    const ids = [...recipient.keys()].filter((id) => !!recipient.get(id));
    if (ids.length === 0) return;

    const alreadyUnread = await this.notificationRepo
      .createQueryBuilder('n')
      .select('n.userId', 'userId')
      .addSelect("n.data->>'conversationId'", 'cid')
      .where('n.userId IN (:...ids)', { ids })
      .andWhere('n.type = :type', { type: NotificationType.CHAT_MESSAGE })
      .andWhere('n.isRead = false')
      .getRawMany();
    const skip = new Set(alreadyUnread.map((r) => `${r.userId}:${r.cid}`));
    const targetsToNotify = ids.filter((id) => !skip.has(`${id}:${recipient.get(id)}`));
    if (targetsToNotify.length === 0) return;

    const name = new Map(depts.map((d) => [d.id, d.name]));
    const extra = targets.filter((t) => !name.has(t));
    if (extra.length) {
      (await this.deptRepo.find({ where: { id: In(extra) } })).forEach((d) =>
        name.set(d.id, d.name),
      );
    }
    const toLabel =
      targets.length > 3
        ? `${targets.length} departamente`
        : targets.map((t) => name.get(t) || 'departament').join(', ');
    const fromLabel = author.department?.name;
    const title =
      fromLabel && !targets.includes(author.departmentId || '')
        ? `Mesaj: ${fromLabel} → ${toLabel}`
        : `Mesaj in ${toLabel}`;
    const preview = text.length > 120 ? `${text.slice(0, 117)}...` : text;
    await this.notificationsService.createMany(
      targetsToNotify.map((userId) => ({
        userId,
        type: NotificationType.CHAT_MESSAGE,
        title,
        message: `${author.fullName}: ${preview}`,
        data: { conversationId: recipient.get(userId), url: '/chat' },
        skipEmail: true,
      })),
    );
  }

  async deleteMessage(messageId: string, requester: Requester) {
    const me = await this.loadMe(requester);
    const msg = await this.msgRepo.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Mesajul nu a fost gasit');
    if (msg.userId !== me.id && !this.isAdmin(me)) {
      throw new ForbiddenException('Poti sterge doar mesajele tale');
    }
    await this.msgRepo.remove(msg);
    return { ok: true };
  }

  // ============== CONVERSATII PRIVATE ==============

  async startDirect(otherUserId: string, requester: Requester): Promise<ConversationSummary> {
    const me = await this.loadMe(requester);
    if (otherUserId === me.id) throw new BadRequestException('Nu iti poti scrie singur');
    const other = await this.userRepo.findOne({
      where: { id: otherUserId, isActive: true },
      relations: ['department'],
    });
    if (!other) throw new NotFoundException('Utilizatorul nu a fost gasit');
    const key = this.directKey(me.id, other.id);
    await this.convRepo
      .createQueryBuilder()
      .insert()
      .into(ChatConversation)
      .values({ type: 'DIRECT', directKey: key })
      .orIgnore()
      .execute();
    const conv = (await this.convRepo.findOne({ where: { directKey: key } }))!;
    return {
      id: conv.id,
      type: 'DIRECT',
      title: other.fullName,
      subtitle: other.department?.name,
      otherUserId: other.id,
      canWrite: true,
      lastMessageAt: conv.lastMessageAt,
      unreadCount: 0,
    };
  }

  /** Oricine poate scrie oricui: lista tuturor utilizatorilor activi. */
  async listUsers(requester: Requester) {
    const me = await this.loadMe(requester);
    const users = await this.userRepo.find({
      where: { isActive: true },
      relations: ['department'],
      order: { fullName: 'ASC' },
    });
    return users
      .filter((u) => u.id !== me.id)
      .map((u) => ({
        id: u.id,
        fullName: u.fullName,
        role: u.role,
        departmentName: u.department?.name || null,
      }));
  }
}
