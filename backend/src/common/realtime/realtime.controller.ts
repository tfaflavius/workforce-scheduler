import {
  Controller,
  Get,
  Post,
  Query,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { RealtimeService } from './realtime.service';

@Controller('events')
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  /** Bilet de conectare (60s, o singura folosire) — se cere cu tokenul obisnuit. */
  @Post('ticket')
  @UseGuards(JwtAuthGuard)
  ticket(@Request() req) {
    return { ticket: this.realtime.issueTicket(req.user.id) };
  }

  /** Fluxul de evenimente (EventSource nu poate trimite header de autorizare -> bilet). */
  @Get()
  @Public()
  stream(@Query('ticket') ticket: string, @Request() req: ExpressRequest, @Res() res: Response) {
    const userId = ticket ? this.realtime.redeemTicket(ticket) : null;
    if (!userId) throw new UnauthorizedException('Bilet invalid sau expirat');

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(`retry: 5000\n\n`);

    this.realtime.addClient(userId, res);
    req.on('close', () => this.realtime.removeClient(userId, res));
  }
}
