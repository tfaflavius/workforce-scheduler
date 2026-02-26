import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as https from 'https';

/**
 * KeepAliveService — Previne oprirea serverului pe Render Free Tier
 *
 * Render Free opreste serverul dupa 15 min de inactivitate.
 * Acest serviciu face un self-ping la fiecare 14 minute pentru a-l tine activ.
 *
 * Flux:
 * 1. Dimineata, un utilizator deschide aplicatia → serverul porneste
 * 2. Self-ping-ul incepe si ruleaza la fiecare 14 min
 * 3. Serverul ramane activ toata ziua
 * 4. Cron-urile de la 20:00 si 20:30 ruleaza cu succes
 * 5. Peste noapte, daca nimeni nu foloseste app-ul, serverul se opreste
 * 6. A doua zi, ciclul se repeta
 */
@Injectable()
export class KeepAliveService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KeepAliveService.name);
  private readonly healthUrl: string;

  constructor() {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.FRONTEND_URL;
    // Use the Render external URL if available, otherwise construct from known URL
    if (process.env.RENDER_EXTERNAL_URL) {
      this.healthUrl = `${process.env.RENDER_EXTERNAL_URL}/api/health`;
    } else if (process.env.NODE_ENV === 'production') {
      // Fallback: hardcoded Render URL
      this.healthUrl = 'https://workforce-scheduler-mzgd.onrender.com/api/health';
    } else {
      this.healthUrl = '';
    }
  }

  onApplicationBootstrap() {
    if (this.healthUrl) {
      this.logger.log(`Keep-alive activ — ping la fiecare 14 min: ${this.healthUrl}`);
    } else {
      this.logger.log('Keep-alive dezactivat (development mode)');
    }
  }

  /**
   * Self-ping la fiecare 14 minute (Render opreste dupa 15 min inactivitate)
   * Ruleaza 24/7 cat timp serverul e activ
   */
  @Cron('*/14 * * * *')
  async handleKeepAlive() {
    if (!this.healthUrl) return;

    try {
      const status = await this.ping(this.healthUrl);
      this.logger.debug(`Keep-alive ping OK (${status})`);
    } catch (error) {
      this.logger.warn(`Keep-alive ping failed: ${error.message}`);
    }
  }

  private ping(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: 10000 }, (res) => {
        // Consume response data to free up memory
        res.resume();
        resolve(res.statusCode || 0);
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  }
}
