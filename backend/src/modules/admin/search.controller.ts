import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ParkingIssue } from '../parking/entities/parking-issue.entity';
import { LeaveRequest } from '../leave-requests/entities/leave-request.entity';
import { ShiftSwapRequest } from '../shift-swaps/entities/shift-swap-request.entity';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
}

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ParkingIssue)
    private readonly parkingIssueRepo: Repository<ParkingIssue>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(ShiftSwapRequest)
    private readonly shiftSwapRepo: Repository<ShiftSwapRequest>,
  ) {}

  @Get()
  async search(@Query('q') query: string, @Req() req: any): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const q = query.trim();
    const results: SearchResult[] = [];

    // Search users
    const users = await this.userRepo.find({
      where: [
        { fullName: ILike(`%${q}%`) },
        { email: ILike(`%${q}%`) },
      ],
      take: 5,
      relations: ['department'],
    });
    users.forEach(u => {
      results.push({
        type: 'user',
        id: u.id,
        title: u.fullName,
        subtitle: `${u.email} - ${u.department?.name || u.role}`,
        url: `/users`,
      });
    });

    // Search parking issues
    const issues = await this.parkingIssueRepo.find({
      where: [
        { description: ILike(`%${q}%`) },
        { equipment: ILike(`%${q}%`) },
        { contactedCompany: ILike(`%${q}%`) },
      ],
      take: 5,
      relations: ['parkingLot'],
      order: { createdAt: 'DESC' },
    });
    issues.forEach(i => {
      results.push({
        type: 'parking_issue',
        id: i.id,
        title: `Problema: ${i.equipment || 'N/A'}`,
        subtitle: `${i.parkingLot?.name || 'N/A'} - ${i.status}`,
        url: `/parking`,
      });
    });

    // Search leave requests
    const leaves = await this.leaveRepo.find({
      where: [
        { reason: ILike(`%${q}%`) },
      ],
      take: 5,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    leaves.forEach(l => {
      results.push({
        type: 'leave_request',
        id: l.id,
        title: `Concediu: ${l.user?.fullName || 'N/A'}`,
        subtitle: `${l.leaveType} - ${l.status}`,
        url: `/admin/leave-requests`,
      });
    });

    return results.slice(0, 15);
  }
}
