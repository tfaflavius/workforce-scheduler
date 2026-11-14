import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { Response } from 'express';

export type RealtimeEventType = 'notification' | 'chat';

/**
 * Evenimente in timp real catre aplicatie (Server-Sent Events).
 * Fiecare om deschis in aplicatie are o conexiune; cand apare o notificare sau un mesaj
 * de chat pentru el, ii trimitem un semnal si aplicatia isi reincarca datele pe loc.
 * Doar un semnal ("s-a schimbat ceva"), datele vin prin API-ul obisnuit, cu drepturile lui.
 */
@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly clients = new Map<string, Set<Response>>();
  /** Bilete de conectare de unica folosinta (60s), ca tokenul sa nu apara in URL. */
  private readonly tickets = new Map<string, { userId: string; expires: number }>();
  private readonly heartbeat: NodeJS.Timeout;

  constructor() {
    // Semnal periodic: tine conexiunea deschisa prin proxy-uri si detecteaza deconectarile
    this.heartbeat = setInterval(() => this.ping(), 25_000);
    this.heartbeat.unref?.();
  }

  onModuleDestroy() {
    clearInterval(this.heartbeat);
    for (const set of this.clients.values()) for (const res of set) res.end();
    this.clients.clear();
  }

  issueTicket(userId: string): string {
    const now = Date.now();
    for (const [k, t] of this.tickets) if (t.expires < now) this.tickets.delete(k);
    const ticket = randomBytes(24).toString('hex');
    this.tickets.set(ticket, { userId, expires: now + 60_000 });
    return ticket;
  }

  redeemTicket(ticket: string): string | null {
    const t = this.tickets.get(ticket);
    this.tickets.delete(ticket);
    if (!t || t.expires < Date.now()) return null;
    return t.userId;
  }

  addClient(userId: string, res: Response) {
    if (!this.clients.has(userId)) this.clients.set(userId, new Set());
    const set = this.clients.get(userId)!;
    // Limita de siguranta: maxim 5 conexiuni pe om (telefon, tableta, calculator...)
    if (set.size >= 5) {
      const oldest = set.values().next().value as Response;
      set.delete(oldest);
      oldest.end();
    }
    set.add(res);
    res.write(`event: ready\ndata: {}\n\n`);
  }

  removeClient(userId: string, res: Response) {
    const set = this.clients.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) this.clients.delete(userId);
  }

  emit(userIds: Iterable<string>, type: RealtimeEventType, data: Record<string, unknown> = {}) {
    const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const id of new Set(userIds)) {
      const set = this.clients.get(id);
      if (!set) continue;
      for (const res of set) {
        try {
          res.write(payload);
        } catch {
          this.removeClient(id, res);
        }
      }
    }
  }

  connectedUsers(): number {
    return this.clients.size;
  }

  private ping() {
    for (const [id, set] of this.clients) {
      for (const res of set) {
        try {
          res.write(`: ping\n\n`);
        } catch {
          this.removeClient(id, res);
        }
      }
    }
  }
}
