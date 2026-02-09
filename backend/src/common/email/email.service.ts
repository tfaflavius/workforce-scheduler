import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

// ============== INTERFACES ==============

export interface ScheduleEmailData {
  employeeEmail: string;
  employeeName: string;
  monthYear: string;
  scheduleType: 'created' | 'updated' | 'approved' | 'rejected';
  shifts?: Array<{
    date: string;
    shiftType: string;
    startTime: string;
    endTime: string;
  }>;
  rejectionReason?: string;
}

export interface LeaveRequestEmailData {
  employeeEmail: string;
  employeeName: string;
  leaveType: 'ANNUAL' | 'SICK' | 'UNPAID' | 'OTHER';
  startDate: string;
  endDate: string;
  totalDays: number;
  status: 'submitted' | 'approved' | 'rejected';
  rejectionReason?: string;
  approverName?: string;
}

export interface ParkingIssueEmailData {
  recipientEmail: string;
  recipientName: string;
  parkingLotName: string;
  equipment: string;
  description: string;
  isUrgent: boolean;
  creatorName: string;
  issueType: 'new_issue' | 'issue_resolved' | 'urgent_reminder';
  resolutionDescription?: string;
}

export interface WelcomeEmailData {
  employeeEmail: string;
  employeeName: string;
  temporaryPassword?: string;
  loginUrl: string;
}

export interface PasswordResetEmailData {
  employeeEmail: string;
  employeeName: string;
  resetToken: string;
  resetUrl: string;
}

// ============== SERVICE ==============

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private fromEmail: string;
  private isEnabled: boolean;
  private appUrl: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
    this.appUrl = this.configService.get<string>('FRONTEND_URL') || 'https://workforce-scheduler.vercel.app';
    this.isEnabled = !!apiKey;

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Email service initialized with Resend');
    } else {
      this.logger.warn('RESEND_API_KEY not configured - email notifications disabled');
    }
  }

  // ============== HELPER METHODS ==============

  private formatMonthYear(monthYear: string): string {
    const [year, month] = monthYear.split('-');
    const months = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  private getLeaveTypeLabel(leaveType: string): string {
    const labels: Record<string, string> = {
      'ANNUAL': 'Concediu de odihnă',
      'SICK': 'Concediu medical',
      'UNPAID': 'Concediu fără plată',
      'OTHER': 'Alte tipuri'
    };
    return labels[leaveType] || leaveType;
  }

  private generateBaseTemplate(title: string, subtitle: string, content: string, gradientColors: string = '#667eea 0%, #764ba2 100%'): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${gradientColors}); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">WorkSchedule</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">${subtitle}</p>
        </div>

        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
          ${content}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              Acest email a fost trimis automat. Te rugăm să nu răspunzi la acest mesaj.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.isEnabled || !this.resend) {
      this.logger.warn(`Email not sent (service disabled): ${subject} to ${to}`);
      return false;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent successfully to ${to}: ${subject}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  // ============== SCHEDULE EMAILS ==============

  private generateScheduleHtml(data: ScheduleEmailData): string {
    const monthFormatted = this.formatMonthYear(data.monthYear);

    let actionText = '';
    let actionColor = '#4CAF50';
    switch (data.scheduleType) {
      case 'created':
        actionText = 'a fost creat';
        actionColor = '#4CAF50';
        break;
      case 'updated':
        actionText = 'a fost modificat';
        actionColor = '#2196F3';
        break;
      case 'approved':
        actionText = 'a fost aprobat';
        actionColor = '#4CAF50';
        break;
      case 'rejected':
        actionText = 'a fost respins';
        actionColor = '#f44336';
        break;
    }

    let shiftsTable = '';
    if (data.shifts && data.shifts.length > 0) {
      const shiftsRows = data.shifts.map(shift => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${shift.date}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${shift.shiftType}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${shift.startTime} - ${shift.endTime}</td>
        </tr>
      `).join('');

      shiftsTable = `
        <h3 style="color: #333; margin-top: 20px;">Turele programate:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Data</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Tip Tură</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Interval Orar</th>
            </tr>
          </thead>
          <tbody>
            ${shiftsRows}
          </tbody>
        </table>
      `;
    }

    let rejectionSection = '';
    if (data.scheduleType === 'rejected' && data.rejectionReason) {
      rejectionSection = `
        <div style="background-color: #ffebee; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f44336;">
          <strong>Motivul respingerii:</strong>
          <p style="margin: 10px 0 0 0;">${data.rejectionReason}</p>
        </div>
      `;
    }

    const content = `
      <p style="font-size: 16px;">Bună ziua, <strong>${data.employeeName}</strong>!</p>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${actionColor};">
        <p style="margin: 0; font-size: 16px;">
          Programul tău de lucru pentru luna <strong>${monthFormatted}</strong> ${actionText}.
        </p>
      </div>

      ${rejectionSection}
      ${shiftsTable}

      <p style="margin-top: 30px;">
        Pentru a vizualiza programul complet, te rugăm să accesezi aplicația WorkSchedule.
      </p>
    `;

    return this.generateBaseTemplate('WorkSchedule', 'Notificare Program de Lucru', content);
  }

  async sendScheduleNotification(data: ScheduleEmailData): Promise<boolean> {
    const monthFormatted = this.formatMonthYear(data.monthYear);
    const subjects: Record<string, string> = {
      'created': `Program de lucru creat pentru ${monthFormatted}`,
      'updated': `Program de lucru modificat pentru ${monthFormatted}`,
      'approved': `Program de lucru aprobat pentru ${monthFormatted}`,
      'rejected': `Program de lucru respins pentru ${monthFormatted}`,
    };

    return this.sendEmail(
      data.employeeEmail,
      subjects[data.scheduleType] || `Notificare program - ${monthFormatted}`,
      this.generateScheduleHtml(data)
    );
  }

  async sendBulkScheduleNotifications(dataList: ScheduleEmailData[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const data of dataList) {
      const result = await this.sendScheduleNotification(data);
      if (result) success++;
      else failed++;
    }

    return { success, failed };
  }

  // ============== LEAVE REQUEST EMAILS ==============

  private generateLeaveRequestHtml(data: LeaveRequestEmailData): string {
    let statusText = '';
    let statusColor = '#2196F3';
    let gradientColors = '#667eea 0%, #764ba2 100%';

    switch (data.status) {
      case 'submitted':
        statusText = 'a fost înregistrată și așteaptă aprobare';
        statusColor = '#2196F3';
        break;
      case 'approved':
        statusText = 'a fost aprobată';
        statusColor = '#4CAF50';
        gradientColors = '#4CAF50 0%, #45a049 100%';
        break;
      case 'rejected':
        statusText = 'a fost respinsă';
        statusColor = '#f44336';
        gradientColors = '#f44336 0%, #d32f2f 100%';
        break;
    }

    let rejectionSection = '';
    if (data.status === 'rejected' && data.rejectionReason) {
      rejectionSection = `
        <div style="background-color: #ffebee; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f44336;">
          <strong>Motivul respingerii:</strong>
          <p style="margin: 10px 0 0 0;">${data.rejectionReason}</p>
        </div>
      `;
    }

    let approverSection = '';
    if (data.approverName && data.status !== 'submitted') {
      approverSection = `
        <p style="color: #666; font-size: 14px; margin-top: 15px;">
          ${data.status === 'approved' ? 'Aprobat' : 'Respins'} de: <strong>${data.approverName}</strong>
        </p>
      `;
    }

    const content = `
      <p style="font-size: 16px;">Bună ziua, <strong>${data.employeeName}</strong>!</p>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
        <p style="margin: 0; font-size: 16px;">
          Cererea ta de <strong>${this.getLeaveTypeLabel(data.leaveType)}</strong> ${statusText}.
        </p>
      </div>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #333;">Detalii cerere:</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px 0; color: #666;">Tip concediu:</td>
            <td style="padding: 5px 0; font-weight: bold;">${this.getLeaveTypeLabel(data.leaveType)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Perioada:</td>
            <td style="padding: 5px 0; font-weight: bold;">${this.formatDate(data.startDate)} - ${this.formatDate(data.endDate)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Total zile:</td>
            <td style="padding: 5px 0; font-weight: bold;">${data.totalDays} ${data.totalDays === 1 ? 'zi' : 'zile'}</td>
          </tr>
        </table>
      </div>

      ${rejectionSection}
      ${approverSection}

      <p style="margin-top: 30px;">
        <a href="${this.appUrl}/leave-requests" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          Vezi cererile mele
        </a>
      </p>
    `;

    return this.generateBaseTemplate('WorkSchedule', 'Notificare Cerere Concediu', content, gradientColors);
  }

  async sendLeaveRequestNotification(data: LeaveRequestEmailData): Promise<boolean> {
    const subjects: Record<string, string> = {
      'submitted': `Cerere de ${this.getLeaveTypeLabel(data.leaveType)} înregistrată`,
      'approved': `Cerere de ${this.getLeaveTypeLabel(data.leaveType)} aprobată ✅`,
      'rejected': `Cerere de ${this.getLeaveTypeLabel(data.leaveType)} respinsă`,
    };

    return this.sendEmail(
      data.employeeEmail,
      subjects[data.status],
      this.generateLeaveRequestHtml(data)
    );
  }

  // Notificare pentru manageri/admini când se creează o cerere nouă
  async sendLeaveRequestNotificationToApprover(
    approverEmail: string,
    approverName: string,
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    totalDays: number
  ): Promise<boolean> {
    const content = `
      <p style="font-size: 16px;">Bună ziua, <strong>${approverName}</strong>!</p>

      <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
        <p style="margin: 0; font-size: 16px;">
          <strong>${employeeName}</strong> a depus o cerere de concediu care necesită aprobare.
        </p>
      </div>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #333;">Detalii cerere:</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px 0; color: #666;">Angajat:</td>
            <td style="padding: 5px 0; font-weight: bold;">${employeeName}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Tip concediu:</td>
            <td style="padding: 5px 0; font-weight: bold;">${this.getLeaveTypeLabel(leaveType)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Perioada:</td>
            <td style="padding: 5px 0; font-weight: bold;">${this.formatDate(startDate)} - ${this.formatDate(endDate)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Total zile:</td>
            <td style="padding: 5px 0; font-weight: bold;">${totalDays} ${totalDays === 1 ? 'zi' : 'zile'}</td>
          </tr>
        </table>
      </div>

      <p style="margin-top: 30px;">
        <a href="${this.appUrl}/leave-requests" style="display: inline-block; background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          Aprobă sau Respinge
        </a>
      </p>
    `;

    return this.sendEmail(
      approverEmail,
      `⏳ Cerere de concediu de la ${employeeName}`,
      this.generateBaseTemplate('WorkSchedule', 'Cerere Concediu Nouă', content, '#ff9800 0%, #f57c00 100%')
    );
  }

  // ============== PARKING ISSUE EMAILS ==============

  private generateParkingIssueHtml(data: ParkingIssueEmailData): string {
    let statusText = '';
    let statusColor = '#f44336';
    let gradientColors = '#f44336 0%, #d32f2f 100%';
    let subtitle = 'Problemă Parcare';

    switch (data.issueType) {
      case 'new_issue':
        statusText = data.isUrgent ? 'O problemă URGENTĂ a fost raportată' : 'O nouă problemă a fost raportată';
        statusColor = data.isUrgent ? '#f44336' : '#ff9800';
        gradientColors = data.isUrgent ? '#f44336 0%, #d32f2f 100%' : '#ff9800 0%, #f57c00 100%';
        subtitle = data.isUrgent ? '🚨 Problemă Urgentă Parcare' : 'Problemă Nouă Parcare';
        break;
      case 'issue_resolved':
        statusText = 'Problema a fost rezolvată';
        statusColor = '#4CAF50';
        gradientColors = '#4CAF50 0%, #45a049 100%';
        subtitle = '✅ Problemă Rezolvată';
        break;
      case 'urgent_reminder':
        statusText = 'Această problemă urgentă este nerezolvată de peste 48 de ore!';
        statusColor = '#f44336';
        gradientColors = '#f44336 0%, #d32f2f 100%';
        subtitle = '🚨 Reminder Problemă Urgentă';
        break;
    }

    let resolutionSection = '';
    if (data.issueType === 'issue_resolved' && data.resolutionDescription) {
      resolutionSection = `
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #4CAF50;">
          <strong>Soluția aplicată:</strong>
          <p style="margin: 10px 0 0 0;">${data.resolutionDescription}</p>
        </div>
      `;
    }

    const urgentBadge = data.isUrgent && data.issueType !== 'issue_resolved'
      ? '<span style="background-color: #f44336; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px;">URGENT</span>'
      : '';

    const content = `
      <p style="font-size: 16px;">Bună ziua, <strong>${data.recipientName}</strong>!</p>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
        <p style="margin: 0; font-size: 16px;">${statusText}</p>
      </div>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #333;">Detalii problemă: ${urgentBadge}</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px 0; color: #666;">Parcare:</td>
            <td style="padding: 5px 0; font-weight: bold;">${data.parkingLotName}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Echipament:</td>
            <td style="padding: 5px 0; font-weight: bold;">${data.equipment}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Descriere:</td>
            <td style="padding: 5px 0;">${data.description}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Raportat de:</td>
            <td style="padding: 5px 0;">${data.creatorName}</td>
          </tr>
        </table>
      </div>

      ${resolutionSection}

      <p style="margin-top: 30px;">
        <a href="${this.appUrl}/parking" style="display: inline-block; background: linear-gradient(135deg, ${gradientColors}); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          Vezi detalii
        </a>
      </p>
    `;

    return this.generateBaseTemplate('WorkSchedule', subtitle, content, gradientColors);
  }

  async sendParkingIssueNotification(data: ParkingIssueEmailData): Promise<boolean> {
    const subjects: Record<string, string> = {
      'new_issue': data.isUrgent
        ? `🚨 URGENT: Problemă la ${data.parkingLotName}`
        : `Problemă nouă la ${data.parkingLotName}`,
      'issue_resolved': `✅ Problemă rezolvată la ${data.parkingLotName}`,
      'urgent_reminder': `🚨 REMINDER: Problemă urgentă nerezolvată la ${data.parkingLotName}`,
    };

    return this.sendEmail(
      data.recipientEmail,
      subjects[data.issueType],
      this.generateParkingIssueHtml(data)
    );
  }

  // ============== WELCOME EMAIL ==============

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    let passwordSection = '';
    if (data.temporaryPassword) {
      passwordSection = `
        <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
          <strong>⚠️ Parola temporară:</strong>
          <p style="margin: 10px 0 0 0; font-family: monospace; font-size: 18px; background: #f5f5f5; padding: 10px; border-radius: 4px;">
            ${data.temporaryPassword}
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 10px;">
            Te rugăm să îți schimbi parola după prima autentificare.
          </p>
        </div>
      `;
    }

    const content = `
      <p style="font-size: 16px;">Bună ziua, <strong>${data.employeeName}</strong>!</p>

      <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
        <p style="margin: 0; font-size: 16px;">
          🎉 Bine ai venit în echipa <strong>WorkSchedule</strong>!
        </p>
        <p style="margin: 10px 0 0 0;">
          Contul tău a fost creat și poți accesa aplicația pentru a vedea programul de lucru, cererile de concediu și multe altele.
        </p>
      </div>

      ${passwordSection}

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #333;">Ce poți face în aplicație:</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li style="padding: 5px 0;">📅 Vizualizează programul tău de lucru</li>
          <li style="padding: 5px 0;">🏖️ Trimite cereri de concediu</li>
          <li style="padding: 5px 0;">🔔 Primește notificări importante</li>
          <li style="padding: 5px 0;">📊 Vezi statistici și rapoarte</li>
        </ul>
      </div>

      <p style="margin-top: 30px;">
        <a href="${data.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          Accesează aplicația
        </a>
      </p>

      <p style="color: #666; margin-top: 20px;">
        Dacă ai întrebări, contactează administratorul sistemului.
      </p>
    `;

    return this.sendEmail(
      data.employeeEmail,
      '🎉 Bine ai venit în WorkSchedule!',
      this.generateBaseTemplate('WorkSchedule', 'Bine ai venit!', content, '#4CAF50 0%, #45a049 100%')
    );
  }

  // ============== PASSWORD RESET EMAIL ==============

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    const content = `
      <p style="font-size: 16px;">Bună ziua, <strong>${data.employeeName}</strong>!</p>

      <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
        <p style="margin: 0; font-size: 16px;">
          Am primit o cerere de resetare a parolei pentru contul tău.
        </p>
      </div>

      <p>Dacă tu ai solicitat această resetare, apasă butonul de mai jos pentru a-ți seta o parolă nouă:</p>

      <p style="margin-top: 30px; text-align: center;">
        <a href="${data.resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          Resetează parola
        </a>
      </p>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Acest link este valid pentru <strong>1 oră</strong>.
      </p>

      <div style="background-color: #ffebee; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f44336;">
        <p style="margin: 0; font-size: 14px; color: #666;">
          ⚠️ Dacă nu ai solicitat resetarea parolei, te rugăm să ignori acest email. Parola ta actuală va rămâne neschimbată.
        </p>
      </div>
    `;

    return this.sendEmail(
      data.employeeEmail,
      '🔐 Resetare parolă WorkSchedule',
      this.generateBaseTemplate('WorkSchedule', 'Resetare Parolă', content, '#ff9800 0%, #f57c00 100%')
    );
  }

  // ============== TEST EMAIL ==============

  async sendTestEmail(toEmail: string, toName: string): Promise<boolean> {
    const content = `
      <p style="font-size: 16px;">Bună ziua, <strong>${toName}</strong>!</p>

      <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
        <h2 style="margin: 0 0 10px 0; color: #4CAF50;">✅ Emailurile funcționează!</h2>
        <p style="margin: 0;">Acesta este un email de test pentru a confirma că sistemul de notificări funcționează corect.</p>
      </div>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #333;">Tipuri de notificări active:</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li style="padding: 5px 0;">📅 Programe de lucru (creat, modificat, aprobat, respins)</li>
          <li style="padding: 5px 0;">🏖️ Cereri de concediu (depus, aprobat, respins)</li>
          <li style="padding: 5px 0;">🚗 Probleme parcări (nouă, rezolvată, reminder urgent)</li>
          <li style="padding: 5px 0;">👋 Welcome email la creare cont nou</li>
        </ul>
      </div>

      <p style="color: #666; font-size: 14px;">
        Trimis la: <strong>${new Date().toLocaleString('ro-RO')}</strong>
      </p>
    `;

    return this.sendEmail(
      toEmail,
      '🧪 Test WorkSchedule - Emailurile funcționează!',
      this.generateBaseTemplate('WorkSchedule', 'Email de Test', content, '#4CAF50 0%, #45a049 100%')
    );
  }
}
