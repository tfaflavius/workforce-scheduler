import { managerDeptScope } from '../../common/utils/manager-scope';
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

    // Ultimul mesaj din fiecare conversatie
    const lastRows: Array<{
      conversation_id: string;
      message: string;
      user_id: string;
      created_at: Date;
      full_name: string;
    }> = await this.msgRepo.query(
      `SELECT DISTINCT ON (m.conversation_id) m.conversation_id, m.message, m.user_id, m.created_at, u.full_name
         FROM chat_messages m JOIN users u ON u.id = m.user_id
         WHERE m.conversation_id = ANY($1)
         ORDER BY m.conversation_id, m.created_at DESC`,
      [ids],
    );
    const lastMap = new Map(lastRows.map((r) => [r.conversation_id, r]));

    // Necitite: mesajele altora de dupa ultima citire
    const unreadRows: Array<{ conversation_id: string; c: string }> = await this.msgRepo.query(
      `SELECT m.conversation_id, COUNT(*)::int AS c
       FROM chat_messages m
       LEFT JOIN chat_reads r ON r.conversation_id = m.conversation_id AND r.user_id = $2
       WHERE m.conversation_id = ANY($1) AND m.user_id <> $2
         AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)
       GROUP BY m.conversation_id`,
      [ids, me.id],
    );
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
        lastMessageAt: c.lastMessageAt,
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

    const rows = await this.msgRepo.find({
      where: { conversationId, ...(before ? { createdAt: LessThan(new Date(before)) } : {}) },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: PAGE_SIZE,
    });
    if (!before) await this.markRead(conversationId, me.id);

    return {
      canWrite,
      hasMore: rows.length === PAGE_SIZE,
      messages: rows.reverse().map((m) => ({
        id: m.id,
        userId: m.userId,
        userName: m.user?.fullName || 'Utilizator',
        userRole: m.user?.role,
        message: m.message,
        createdAt: m.createdAt,
      })),
    };
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

  async sendMessage(conversationId: string, text: string, requester: Requester) {
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
