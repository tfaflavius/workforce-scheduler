import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface ScheduleEmailData {
  employeeEmail: string;
  employeeName: string;
  monthYear: string; // Format: "2025-02"
  scheduleType: 'created' | 'updated' | 'approved' | 'rejected';
  shifts?: Array<{
    date: string;
    shiftType: string;
    startTime: string;
    endTime: string;
  }>;
  rejectionReason?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private fromEmail: string;
  private isEnabled: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
    this.isEnabled = !!apiKey;

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Email service initialized with Resend');
    } else {
      this.logger.warn('RESEND_API_KEY not configured - email notifications disabled');
    }
  }

  private formatMonthYear(monthYear: string): string {
    const [year, month] = monthYear.split('-');
    const months = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  }

  private getSubject(data: ScheduleEmailData): string {
    const monthFormatted = this.formatMonthYear(data.monthYear);
    switch (data.scheduleType) {
      case 'created':
        return `Program de lucru creat pentru ${monthFormatted}`;
      case 'updated':
        return `Program de lucru modificat pentru ${monthFormatted}`;
      case 'approved':
        return `Program de lucru aprobat pentru ${monthFormatted}`;
      case 'rejected':
        return `Program de lucru respins pentru ${monthFormatted}`;
      default:
        return `Notificare program de lucru - ${monthFormatted}`;
    }
  }

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

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">WorkSchedule</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Notificare Program de Lucru</p>
        </div>

        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
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

  async sendScheduleNotification(data: ScheduleEmailData): Promise<boolean> {
    if (!this.isEnabled || !this.resend) {
      this.logger.warn(`Email not sent (service disabled): ${data.scheduleType} to ${data.employeeEmail}`);
      return false;
    }

    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: data.employeeEmail,
        subject: this.getSubject(data),
        html: this.generateScheduleHtml(data),
      });

      this.logger.log(`Email sent successfully to ${data.employeeEmail}: ${data.scheduleType}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${data.employeeEmail}:`, error);
      return false;
    }
  }

  async sendBulkScheduleNotifications(dataList: ScheduleEmailData[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const data of dataList) {
      const result = await this.sendScheduleNotification(data);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }
}
