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

export interface ParkingDamageEmailData {
  recipientEmail: string;
  recipientName: string;
  parkingLotName: string;
  damagedEquipment: string;
  personName: string;
  carPlate: string;
  description: string;
  isUrgent: boolean;
  creatorName: string;
  damageType: 'new_damage' | 'damage_resolved' | 'urgent_reminder';
  resolutionType?: string;
  resolutionDescription?: string;
}

export interface ShiftSwapEmailData {
  recipientEmail: string;
  recipientName: string;
  requesterName: string;
  requesterDate: string;
  targetDate: string;
  reason?: string;
  swapType: 'new_request' | 'response_accepted' | 'response_declined' | 'approved' | 'rejected';
  responderName?: string;
  adminNotes?: string;
}

export interface DailyReportEmailData {
  recipientEmail: string;
  recipientName: string;
  reportDate: string;
  totalAmount: number;
  collectionCount: number;
  byParkingLot: Array<{
    parkingLotName: string;
    totalAmount: number;
    count: number;
  }>;
  byMachine: Array<{
    machineNumber: string;
    parkingLotName: string;
    totalAmount: number;
    count: number;
  }>;
}

export interface EditRequestEmailData {
  recipientEmail: string;
  recipientName: string;
  requesterName: string;
  requestType: 'PARKING_ISSUE' | 'PARKING_DAMAGE' | 'CASH_COLLECTION';
  entityDescription: string;
  proposedChanges: Record<string, { from: any; to: any }>;
  reason?: string;
  status: 'new_request' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface UnresolvedItemsReminderData {
  recipientEmail: string;
  recipientName: string;
  unresolvedIssues: Array<{
    parkingLotName: string;
    equipment: string;
    createdAt: string;
    daysOpen: number;
    isUrgent: boolean;
  }>;
  unresolvedDamages: Array<{
    parkingLotName: string;
    damagedEquipment: string;
    personName: string;
    carPlate: string;
    createdAt: string;
    daysOpen: number;
    isUrgent: boolean;
  }>;
}

export interface HandicapRequestEmailData {
  recipientEmail: string;
  recipientName: string;
  requestType: 'AMPLASARE_PANOU' | 'REVOCARE_PANOU' | 'CREARE_MARCAJ';
  location: string;
  personName?: string;
  description: string;
  creatorName: string;
  emailType: 'new_request' | 'request_resolved';
  resolutionDescription?: string;
}

export interface DomiciliuRequestEmailData {
  recipientEmail: string;
  recipientName: string;
  requestType: 'APROBARE_LOC' | 'REVOCARE_LOC' | 'MODIFICARE_DATE';
  location: string;
  personName: string;
  address: string;
  carPlate: string;
  description: string;
  creatorName: string;
  emailType: 'new_request' | 'request_resolved';
  resolutionDescription?: string;
}

// ============== SERVICE ==============

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private fromEmail: string;
  private isEnabled: boolean;
  private appUrl: string;

  // Lista de email-uri/domenii de test - nu se trimit email-uri automate la acestea
  private readonly testEmailPatterns: string[] = [
    '@workforce.com',           // Toate conturile interne de test
    '@test.com',                // Conturi de test generice
    '@example.com',             // Conturi de exemplu
    'test@',                    // Orice email care începe cu test@
    'tartaflavius22@gmail.com', // Cont personal de test
  ];

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

  /**
   * Verifică dacă un email este un cont de test
   * Conturile de test nu primesc email-uri automate
   */
  private isTestEmail(email: string): boolean {
    const emailLower = email.toLowerCase();
    return this.testEmailPatterns.some(pattern => {
      if (pattern.startsWith('@')) {
        // Verifică domeniul (ex: @workforce.com)
        return emailLower.endsWith(pattern);
      } else if (pattern.endsWith('@')) {
        // Verifică prefixul (ex: test@)
        return emailLower.startsWith(pattern);
      }
      // Verifică potrivire exactă sau parțială
      return emailLower.includes(pattern);
    });
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

  private async sendEmail(to: string, subject: string, html: string, forceTestEmail: boolean = false): Promise<boolean> {
    if (!this.isEnabled || !this.resend) {
      this.logger.warn(`Email not sent (service disabled): ${subject} to ${to}`);
      return false;
    }

    // Blochează email-urile către conturile de test (dacă nu este forțat)
    if (!forceTestEmail && this.isTestEmail(to)) {
      this.logger.log(`Email skipped (test account): ${subject} to ${to}`);
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

  /**
   * Trimite email forțat - inclusiv la conturile de test
   * Folosit doar când se solicită explicit trimiterea de email-uri de test
   */
  async sendForcedEmail(to: string, subject: string, html: string): Promise<boolean> {
    return this.sendEmail(to, subject, html, true);
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

  // ============== PARKING DAMAGE EMAILS ==============

  private generateParkingDamageHtml(data: ParkingDamageEmailData): string {
    let statusText = '';
    let statusColor = '#f44336';
    let gradientColors = '#f44336 0%, #d32f2f 100%';
    let subtitle = 'Prejudiciu Parcare';

    switch (data.damageType) {
      case 'new_damage':
        statusText = data.isUrgent ? 'Un prejudiciu URGENT a fost raportat' : 'Un prejudiciu nou a fost raportat';
        statusColor = data.isUrgent ? '#f44336' : '#ff9800';
        gradientColors = data.isUrgent ? '#f44336 0%, #d32f2f 100%' : '#ff9800 0%, #f57c00 100%';
        subtitle = data.isUrgent ? '🚨 Prejudiciu Urgent' : 'Prejudiciu Nou';
        break;
      case 'damage_resolved':
        statusText = 'Prejudiciul a fost finalizat';
        statusColor = '#4CAF50';
        gradientColors = '#4CAF50 0%, #45a049 100%';
        subtitle = '✅ Prejudiciu Finalizat';
        break;
      case 'urgent_reminder':
        statusText = 'Acest prejudiciu este nerezolvat de peste 48 de ore!';
        statusColor = '#f44336';
        gradientColors = '#f44336 0%, #d32f2f 100%';
        subtitle = '🚨 Reminder Prejudiciu Urgent';
        break;
    }

    let resolutionSection = '';
    if (data.damageType === 'damage_resolved' && data.resolutionDescription) {
      const resolutionTypeLabel = data.resolutionType === 'RECUPERAT' ? 'Recuperat' : 'Trimis la Juridic';
      resolutionSection = `
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #4CAF50;">
          <strong>Tip finalizare:</strong> ${resolutionTypeLabel}
          <p style="margin: 10px 0 0 0;"><strong>Descriere:</strong> ${data.resolutionDescription}</p>
        </div>
      `;
    }

    const urgentBadge = data.isUrgent && data.damageType !== 'damage_resolved'
      ? '<span style="background-color: #f44336; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px;">URGENT</span>'
      : '';

    const content = `
      <p style="font-size: 16px;">Bună ziua, <strong>${data.recipientName}</strong>!</p>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
        <p style="margin: 0; font-size: 16px;">${statusText}</p>
      </div>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #333;">Detalii prejudiciu: ${urgentBadge}</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px 0; color: #666;">Parcare:</td>
            <td style="padding: 5px 0; font-weight: bold;">${data.parkingLotName}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Echipament avariat:</td>
            <td style="padding: 5px 0; font-weight: bold;">${data.damagedEquipment}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Persoană responsabilă:</td>
            <td style="padding: 5px 0; font-weight: bold;">${data.personName}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Număr mașină:</td>
            <td style="padding: 5px 0; font-weight: bold;">${data.carPlate}</td>
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
        <a href="${this.appUrl}/parking?tab=damages" style="display: inline-block; background: linear-gradient(135deg, ${gradientColors}); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          Vezi detalii
        </a>
      </p>
    `;

    return this.generateBaseTemplate('WorkSchedule', subtitle, content, gradientColors);
  }

  async sendParkingDamageNotification(data: ParkingDamageEmailData): Promise<boolean> {
    const subjects: Record<string, string> = {
      'new_damage': data.isUrgent
        ? `🚨 URGENT: Prejudiciu la ${data.parkingLotName}`
        : `Prejudiciu nou la ${data.parkingLotName}`,
      'damage_resolved': `✅ Prejudiciu finalizat la ${data.parkingLotName}`,
      'urgent_reminder': `🚨 REMINDER: Prejudiciu nerezolvat la ${data.parkingLotName}`,
    };

    return this.sendEmail(
      data.recipientEmail,
      subjects[data.damageType],
      this.generateParkingDamageHtml(data)
    );
  }

  // ============== SHIFT SWAP EMAILS ==============

  private generateShiftSwapHtml(data: ShiftSwapEmailData): string {
    let statusText = '';
    let statusColor = '#2196F3';
    let gradientColors = '#2196F3 0%, #1976D2 100%';
    let subtitle = 'Schimb de Tură';

    switch (data.swapType) {
      case 'new_request':
        statusText = `${data.requesterName} dorește să facă schimb de tură cu tine`;
        statusColor = '#ff9800';
        gradientColors = '#ff9800 0%, #f57c00 100%';
        subtitle = '🔄 Cerere Schimb de Tură';
        break;
      case 'response_accepted':
        statusText = `${data.responderName} a acceptat cererea ta de schimb`;
        statusColor = '#4CAF50';
        gradientColors = '#4CAF50 0%, #45a049 100%';
        subtitle = '✅ Cerere Acceptată';
        break;
      case 'response_declined':
        statusText = `${data.responderName} a refuzat cererea ta de schimb`;
        statusColor = '#f44336';
        gradientColors = '#f44336 0%, #d32f2f 100%';
        subtitle = '❌ Cerere Refuzată';
        break;
      case 'approved':
        statusText = 'Schimbul de tură a fost aprobat de administrator!';
        statusColor = '#4CAF50';
        gradientColors = '#4CAF50 0%, #45a049 100%';
        subtitle = '✅ Schimb Aprobat';
        break;
      case 'rejected':
        statusText = 'Schimbul de tură a fost respins de administrator';
        statusColor = '#f44336';
        gradientColors = '#f44336 0%, #d32f2f 100%';
        subtitle = '❌ Schimb Respins';
        break;
    }

    let adminNotesSection = '';
    if (data.adminNotes) {
      adminNotesSection = `
        <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #ff9800;">
          <strong>Notă administrator:</strong>
          <p style="margin: 10px 0 0 0;">${data.adminNotes}</p>
        </div>
      `;
    }

    let reasonSection = '';
    if (data.reason && data.swapType === 'new_request') {
      reasonSection = `
        <tr>
          <td style="padding: 5px 0; color: #666;">Motiv:</td>
          <td style="padding: 5px 0;">${data.reason}</td>
        </tr>
      `;
    }

    const content = `
      <p style="font-size: 16px;">Bună ziua, <strong>${data.recipientName}</strong>!</p>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
        <p style="margin: 0; font-size: 16px;">${statusText}</p>
      </div>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #333;">Detalii schimb:</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px 0; color: #666;">Solicitant:</td>
            <td style="padding: 5px 0; font-weight: bold;">${data.requesterName}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Data solicitant:</td>
            <td style="padding: 5px 0; font-weight: bold;">${data.requesterDate}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Data dorită:</td>
            <td style="padding: 5px 0; font-weight: bold;">${data.targetDate}</td>
          </tr>
          ${reasonSection}
        </table>
      </div>

      ${adminNotesSection}

      <p style="margin-top: 30px;">
        <a href="${this.appUrl}/shift-swaps" style="display: inline-block; background: linear-gradient(135deg, ${gradientColors}); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          Vezi detalii
        </a>
      </p>
    `;

    return this.generateBaseTemplate('WorkSchedule', subtitle, content, gradientColors);
  }

  async sendShiftSwapNotification(data: ShiftSwapEmailData): Promise<boolean> {
    const subjects: Record<string, string> = {
      'new_request': `🔄 Cerere de schimb de tură de la ${data.requesterName}`,
      'response_accepted': `✅ ${data.responderName} a acceptat schimbul de tură`,
      'response_declined': `❌ ${data.responderName} a refuzat schimbul de tură`,
      'approved': `✅ Schimbul de tură a fost aprobat!`,
      'rejected': `❌ Schimbul de tură a fost respins`,
    };

    return this.sendEmail(
      data.recipientEmail,
      subjects[data.swapType],
      this.generateShiftSwapHtml(data)
    );
  }

  // ============== DAILY CASH REPORT EMAIL ==============

  async sendDailyCashReport(data: DailyReportEmailData): Promise<boolean> {
    const parkingLotRows = data.byParkingLot.map(lot => `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">${lot.parkingLotName}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${lot.count}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${lot.totalAmount.toFixed(2)} RON</td>
      </tr>
    `).join('');

    const machineRows = data.byMachine.map(machine => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${machine.machineNumber}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${machine.parkingLotName}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${machine.count}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${machine.totalAmount.toFixed(2)} RON</td>
      </tr>
    `).join('');

    const content = `
      <p style="font-size: 16px;">Bună ziua, <strong>${data.recipientName}</strong>!</p>

      <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
        <h2 style="margin: 0 0 10px 0; color: #1976D2;">📊 Raport Încasări - ${data.reportDate}</h2>
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">
          Total: ${data.totalAmount.toFixed(2)} RON
        </p>
        <p style="margin: 5px 0 0 0; color: #666;">
          ${data.collectionCount} ridicări înregistrate
        </p>
      </div>

      <h3 style="color: #333; margin-top: 30px;">Totaluri per Parcare:</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Parcare</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Ridicări</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${parkingLotRows}
        </tbody>
      </table>

      <h3 style="color: #333; margin-top: 30px;">Detalii per Automat:</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Automat</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Parcare</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Ridicări</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${machineRows}
        </tbody>
      </table>

      <p style="margin-top: 30px;">
        <a href="${this.appUrl}/parking?tab=cash" style="display: inline-block; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          Vezi raport complet
        </a>
      </p>
    `;

    return this.sendEmail(
      data.recipientEmail,
      `📊 Raport Încasări Parcări - ${data.reportDate}`,
      this.generateBaseTemplate('WorkSchedule', 'Raport Zilnic Încasări', content, '#2196F3 0%, #1976D2 100%')
    );
  }

  // ============== UNRESOLVED ITEMS REMINDER EMAIL ==============

  async sendUnresolvedItemsReminder(data: UnresolvedItemsReminderData): Promise<boolean> {
    const totalItems = data.unresolvedIssues.length + data.unresolvedDamages.length;
    const urgentIssues = data.unresolvedIssues.filter(i => i.isUrgent).length;
    const urgentDamages = data.unresolvedDamages.filter(d => d.isUrgent).length;
    const totalUrgent = urgentIssues + urgentDamages;

    let issuesTable = '';
    if (data.unresolvedIssues.length > 0) {
      const issueRows = data.unresolvedIssues.map(issue => `
        <tr style="${issue.isUrgent ? 'background-color: #ffebee;' : ''}">
          <td style="padding: 8px; border: 1px solid #ddd;">${issue.parkingLotName}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${issue.equipment}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${issue.createdAt}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
            ${issue.daysOpen} zile
            ${issue.isUrgent ? '<span style="color: #f44336; font-weight: bold;">⚠️</span>' : ''}
          </td>
        </tr>
      `).join('');

      issuesTable = `
        <h3 style="color: #333; margin-top: 20px;">🔧 Probleme Nerezolvate (${data.unresolvedIssues.length}):</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Parcare</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Echipament</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Data</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Vechime</th>
            </tr>
          </thead>
          <tbody>
            ${issueRows}
          </tbody>
        </table>
      `;
    }

    let damagesTable = '';
    if (data.unresolvedDamages.length > 0) {
      const damageRows = data.unresolvedDamages.map(damage => `
        <tr style="${damage.isUrgent ? 'background-color: #ffebee;' : ''}">
          <td style="padding: 8px; border: 1px solid #ddd;">${damage.parkingLotName}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${damage.damagedEquipment}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${damage.personName}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${damage.carPlate}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
            ${damage.daysOpen} zile
            ${damage.isUrgent ? '<span style="color: #f44336; font-weight: bold;">⚠️</span>' : ''}
          </td>
        </tr>
      `).join('');

      damagesTable = `
        <h3 style="color: #333; margin-top: 20px;">💥 Prejudicii Nerezolvate (${data.unresolvedDamages.length}):</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Parcare</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Echipament</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Persoană</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Nr. Mașină</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Vechime</th>
            </tr>
          </thead>
          <tbody>
            ${damageRows}
          </tbody>
        </table>
      `;
    }

    const urgentWarning = totalUrgent > 0 ? `
      <div style="background-color: #ffebee; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
        <p style="margin: 0; font-weight: bold; color: #f44336;">
          ⚠️ ${totalUrgent} ${totalUrgent === 1 ? 'element urgent' : 'elemente urgente'} (mai vechi de 48h)!
        </p>
      </div>
    ` : '';

    const content = `
      <p style="font-size: 16px;">Bună ziua, <strong>${data.recipientName}</strong>!</p>

      <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
        <p style="margin: 0; font-size: 16px;">
          Ai <strong>${totalItems}</strong> ${totalItems === 1 ? 'element nerezolvat' : 'elemente nerezolvate'} care necesită atenție.
        </p>
      </div>

      ${urgentWarning}
      ${issuesTable}
      ${damagesTable}

      <p style="margin-top: 30px;">
        <a href="${this.appUrl}/parking" style="display: inline-block; background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          Rezolvă acum
        </a>
      </p>
    `;

    return this.sendEmail(
      data.recipientEmail,
      `⏰ Reminder: ${totalItems} ${totalItems === 1 ? 'element nerezolvat' : 'elemente nerezolvate'} - Parcări`,
      this.generateBaseTemplate('WorkSchedule', 'Reminder Elemente Nerezolvate', content, '#ff9800 0%, #f57c00 100%')
    );
  }

  // ============== EDIT REQUEST EMAILS ==============

  private getRequestTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'PARKING_ISSUE': 'Problemă Parcare',
      'PARKING_DAMAGE': 'Prejudiciu Parcare',
      'CASH_COLLECTION': 'Ridicare Încasări',
    };
    return labels[type] || type;
  }

  async sendEditRequestNotification(data: EditRequestEmailData): Promise<boolean> {
    let statusText = '';
    let statusColor = '#ff9800';
    let gradientColors = '#ff9800 0%, #f57c00 100%';
    let subtitle = 'Cerere de Editare';

    switch (data.status) {
      case 'new_request':
        statusText = `${data.requesterName} solicită aprobare pentru editarea unui element`;
        subtitle = '📝 Cerere de Editare Nouă';
        break;
      case 'approved':
        statusText = 'Cererea ta de editare a fost aprobată!';
        statusColor = '#4CAF50';
        gradientColors = '#4CAF50 0%, #45a049 100%';
        subtitle = '✅ Cerere Aprobată';
        break;
      case 'rejected':
        statusText = 'Cererea ta de editare a fost respinsă.';
        statusColor = '#f44336';
        gradientColors = '#f44336 0%, #d32f2f 100%';
        subtitle = '❌ Cerere Respinsă';
        break;
    }

    const changesRows = Object.entries(data.proposedChanges).map(([key, value]) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${key}</td>
        <td style="padding: 8px; border: 1px solid #ddd; color: #f44336;">${value.from || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; color: #4CAF50;">${value.to || '-'}</td>
      </tr>
    `).join('');

    let reasonSection = '';
    if (data.reason) {
      reasonSection = `
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 15px;">
          <strong>Motivul cererii:</strong>
          <p style="margin: 10px 0 0 0;">${data.reason}</p>
        </div>
      `;
    }

    let rejectionSection = '';
    if (data.status === 'rejected' && data.rejectionReason) {
      rejectionSection = `
        <div style="background-color: #ffebee; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #f44336;">
          <strong>Motivul respingerii:</strong>
          <p style="margin: 10px 0 0 0;">${data.rejectionReason}</p>
        </div>
      `;
    }

    const content = `
      <p style="font-size: 16px;">Bună ziua, <strong>${data.recipientName}</strong>!</p>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
        <p style="margin: 0; font-size: 16px;">${statusText}</p>
      </div>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #333;">Detalii cerere:</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px 0; color: #666;">Tip:</td>
            <td style="padding: 5px 0; font-weight: bold;">${this.getRequestTypeLabel(data.requestType)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">Element:</td>
            <td style="padding: 5px 0; font-weight: bold;">${data.entityDescription}</td>
          </tr>
        </table>
      </div>

      ${reasonSection}

      <h4 style="color: #333; margin-top: 20px;">Modificări propuse:</h4>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Câmp</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Valoare veche</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Valoare nouă</th>
          </tr>
        </thead>
        <tbody>
          ${changesRows}
        </tbody>
      </table>

      ${rejectionSection}

      <p style="margin-top: 30px;">
        <a href="${this.appUrl}/admin/edit-requests" style="display: inline-block; background: linear-gradient(135deg, ${gradientColors}); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          ${data.status === 'new_request' ? 'Aprobă sau Respinge' : 'Vezi detalii'}
        </a>
      </p>
    `;

    const subjects: Record<string, string> = {
      'new_request': `📝 Cerere de editare de la ${data.requesterName}`,
      'approved': `✅ Cerere de editare aprobată - ${this.getRequestTypeLabel(data.requestType)}`,
      'rejected': `❌ Cerere de editare respinsă - ${this.getRequestTypeLabel(data.requestType)}`,
    };

    return this.sendEmail(
      data.recipientEmail,
      subjects[data.status],
      this.generateBaseTemplate('WorkSchedule', subtitle, content, gradientColors)
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

    // Folosim forceTestEmail=true pentru că este un test manual solicitat
    return this.sendEmail(
      toEmail,
      '🧪 Test WorkSchedule - Emailurile funcționează!',
      this.generateBaseTemplate('WorkSchedule', 'Email de Test', content, '#4CAF50 0%, #45a049 100%'),
      true // Force send to test accounts when explicitly requested
    );
  }

  // ============== WELCOME BROADCAST EMAIL ==============

  async sendWelcomeBroadcast(toEmail: string, toName: string, role: string): Promise<boolean> {
    const roleLabel = role === 'ADMIN' ? 'Administrator' : role === 'MANAGER' ? 'Manager' : 'Utilizator';

    const content = `
      <p style="font-size: 18px;">Bună ziua, <strong>${toName}</strong>! 👋</p>

      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 12px; margin: 25px 0; color: white;">
        <h2 style="margin: 0 0 15px 0; color: white;">🎉 Bine ai venit pe Workforce App!</h2>
        <p style="margin: 0; font-size: 16px; opacity: 0.95;">
          Suntem încântați să te avem alături de echipa noastră. Aplicația Workforce este aici pentru a-ți face munca mai ușoară și mai organizată.
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #333;">📱 Ce poți face în aplicație:</h3>
        <ul style="margin: 0; padding-left: 20px; line-height: 2;">
          <li style="padding: 5px 0;">📅 <strong>Vizualizează programul de lucru</strong> - Turele tale sunt mereu la îndemână</li>
          <li style="padding: 5px 0;">🔄 <strong>Solicită schimburi de ture</strong> - Schimbă tura cu un coleg în câteva click-uri</li>
          <li style="padding: 5px 0;">🏖️ <strong>Cere concediu</strong> - Depune cereri direct din aplicație</li>
          <li style="padding: 5px 0;">🔔 <strong>Primește notificări</strong> - Fii la curent cu toate schimbările</li>
          <li style="padding: 5px 0;">🚗 <strong>Gestionează parcările</strong> - Raportează probleme și prejudicii</li>
        </ul>
      </div>

      <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
        <p style="margin: 0; font-size: 14px;">
          <strong>Rolul tău:</strong> ${roleLabel}<br>
          <strong>Email:</strong> ${toEmail}
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://workforce-scheduler.vercel.app" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          🚀 Accesează Aplicația
        </a>
      </div>

      <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
        <p style="margin: 0; font-size: 14px;">
          💡 <strong>Sfat:</strong> Instalează aplicația pe telefon pentru acces rapid! Deschide site-ul în browser și apasă "Adaugă pe ecranul principal".
        </p>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 30px; text-align: center;">
        Dacă ai întrebări sau ai nevoie de ajutor, nu ezita să contactezi administratorul.
      </p>
    `;

    return this.sendEmail(
      toEmail,
      '🎉 Bine ai venit pe Workforce App!',
      this.generateBaseTemplate('Workforce App', 'Bine ai venit în echipă!', content, '#667eea 0%, #764ba2 100%')
    );
  }

  // ============== HANDICAP REQUEST EMAILS ==============

  private getHandicapRequestTypeLabel(requestType: string): string {
    const labels: Record<string, string> = {
      'AMPLASARE_PANOU': 'Amplasare panou handicap',
      'REVOCARE_PANOU': 'Revocare panou handicap',
      'CREARE_MARCAJ': 'Creare marcaj handicap',
    };
    return labels[requestType] || requestType;
  }

  private generateHandicapRequestHtml(data: HandicapRequestEmailData): string {
    const requestTypeLabel = this.getHandicapRequestTypeLabel(data.requestType);

    let statusText = '';
    let statusColor = '#2196F3';
    let gradientColors = '#6366f1 0%, #8b5cf6 100%';
    let subtitle = 'Parcări Handicap';

    switch (data.emailType) {
      case 'new_request':
        statusText = `O nouă solicitare de tip "${requestTypeLabel}" a fost creată`;
        statusColor = '#2563eb';
        gradientColors = '#2563eb 0%, #6366f1 100%';
        subtitle = '🆕 Solicitare Nouă';
        break;
      case 'request_resolved':
        statusText = `Solicitarea de tip "${requestTypeLabel}" a fost finalizată`;
        statusColor = '#10b981';
        gradientColors = '#10b981 0%, #059669 100%';
        subtitle = '✅ Solicitare Finalizată';
        break;
    }

    let content = `
      <div style="background-color: ${statusColor}15; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${statusColor};">
        <p style="margin: 0; font-size: 16px; color: #333;">
          ${statusText}
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #333;">📋 Detalii Solicitare</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 40%;">Tip solicitare:</td>
            <td style="padding: 8px 0; color: #333; font-weight: bold;">${requestTypeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Locație:</td>
            <td style="padding: 8px 0; color: #333;">${data.location}</td>
          </tr>
    `;

    if (data.personName) {
      content += `
          <tr>
            <td style="padding: 8px 0; color: #666;">Persoană:</td>
            <td style="padding: 8px 0; color: #333;">${data.personName}</td>
          </tr>
      `;
    }

    content += `
          <tr>
            <td style="padding: 8px 0; color: #666;">${data.emailType === 'new_request' ? 'Creat de:' : 'Finalizat de:'}</td>
            <td style="padding: 8px 0; color: #333;">${data.creatorName}</td>
          </tr>
        </table>
      </div>
    `;

    if (data.description) {
      content += `
        <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Descriere:</p>
          <p style="margin: 0; color: #333;">${data.description}</p>
        </div>
      `;
    }

    if (data.emailType === 'request_resolved' && data.resolutionDescription) {
      content += `
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4CAF50;">
          <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Descriere rezoluție:</p>
          <p style="margin: 0; color: #333;">${data.resolutionDescription}</p>
        </div>
      `;
    }

    content += `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.appUrl}/parking/handicap" style="display: inline-block; background: linear-gradient(135deg, ${gradientColors}); color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: bold;">
          Vezi Solicitarea
        </a>
      </div>
    `;

    return this.generateBaseTemplate('Parcări Handicap', subtitle, content, gradientColors);
  }

  async sendHandicapRequestNotification(data: HandicapRequestEmailData): Promise<boolean> {
    const requestTypeLabel = this.getHandicapRequestTypeLabel(data.requestType);

    const subjects: Record<string, string> = {
      'new_request': `🆕 Solicitare nouă: ${requestTypeLabel}`,
      'request_resolved': `✅ Solicitare finalizată: ${requestTypeLabel}`,
    };

    return this.sendEmail(
      data.recipientEmail,
      subjects[data.emailType],
      this.generateHandicapRequestHtml(data)
    );
  }

  // ============== DOMICILIU REQUEST EMAILS ==============

  private getDomiciliuRequestTypeLabel(requestType: string): string {
    const labels: Record<string, string> = {
      'APROBARE_LOC': 'Aprobare loc parcare domiciliu',
      'REVOCARE_LOC': 'Revocare loc parcare domiciliu',
      'MODIFICARE_DATE': 'Modificare date parcare domiciliu',
    };
    return labels[requestType] || requestType;
  }

  private generateDomiciliuRequestHtml(data: DomiciliuRequestEmailData): string {
    const requestTypeLabel = this.getDomiciliuRequestTypeLabel(data.requestType);

    let statusText = '';
    let statusColor = '#2196F3';
    let gradientColors = '#059669 0%, #10b981 100%';
    let subtitle = 'Parcări Domiciliu';

    switch (data.emailType) {
      case 'new_request':
        statusText = `O nouă solicitare de tip "${requestTypeLabel}" a fost creată`;
        statusColor = '#059669';
        gradientColors = '#059669 0%, #10b981 100%';
        subtitle = '🏠 Solicitare Nouă';
        break;
      case 'request_resolved':
        statusText = `Solicitarea de tip "${requestTypeLabel}" a fost finalizată`;
        statusColor = '#10b981';
        gradientColors = '#10b981 0%, #059669 100%';
        subtitle = '✅ Solicitare Finalizată';
        break;
    }

    let content = `
      <div style="background-color: ${statusColor}15; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${statusColor};">
        <p style="margin: 0; font-size: 16px; color: #333;">
          ${statusText}
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #333;">🏠 Detalii Solicitare</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 40%;">Tip solicitare:</td>
            <td style="padding: 8px 0; color: #333; font-weight: bold;">${requestTypeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Persoană:</td>
            <td style="padding: 8px 0; color: #333; font-weight: bold;">${data.personName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Adresa:</td>
            <td style="padding: 8px 0; color: #333;">${data.address}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Nr. mașină:</td>
            <td style="padding: 8px 0; color: #333;">${data.carPlate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Locație:</td>
            <td style="padding: 8px 0; color: #333;">${data.location}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">${data.emailType === 'new_request' ? 'Creat de:' : 'Finalizat de:'}</td>
            <td style="padding: 8px 0; color: #333;">${data.creatorName}</td>
          </tr>
        </table>
      </div>
    `;

    if (data.description) {
      content += `
        <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Descriere:</p>
          <p style="margin: 0; color: #333;">${data.description}</p>
        </div>
      `;
    }

    if (data.emailType === 'request_resolved' && data.resolutionDescription) {
      content += `
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4CAF50;">
          <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Descriere rezoluție:</p>
          <p style="margin: 0; color: #333;">${data.resolutionDescription}</p>
        </div>
      `;
    }

    content += `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.appUrl}/parking/domiciliu" style="display: inline-block; background: linear-gradient(135deg, ${gradientColors}); color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: bold;">
          Vezi Solicitarea
        </a>
      </div>
    `;

    return this.generateBaseTemplate('Parcări Domiciliu', subtitle, content, gradientColors);
  }

  async sendDomiciliuRequestNotification(data: DomiciliuRequestEmailData): Promise<boolean> {
    const requestTypeLabel = this.getDomiciliuRequestTypeLabel(data.requestType);

    const subjects: Record<string, string> = {
      'new_request': `🏠 Solicitare nouă: ${requestTypeLabel}`,
      'request_resolved': `✅ Solicitare finalizată: ${requestTypeLabel}`,
    };

    return this.sendEmail(
      data.recipientEmail,
      subjects[data.emailType],
      this.generateDomiciliuRequestHtml(data)
    );
  }
}
