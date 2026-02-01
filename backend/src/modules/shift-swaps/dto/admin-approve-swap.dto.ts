import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdminApproveSwapDto {
  @IsUUID()
  @IsNotEmpty()
  approvedResponderId: string; // ID-ul userului ales pentru schimb

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string; // Note opționale de la admin
}

export class AdminRejectSwapDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string; // Motivul respingerii
}
