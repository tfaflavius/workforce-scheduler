export class ReportResponseDto {
  reportId: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  expiresAt: Date; // 24 hours from generation
}
