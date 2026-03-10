import { Controller, Get, Query, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ParkingIssue } from '../parking/entities/parking-issue.entity';
import { ParkingDamage } from '../parking/entities/parking-damage.entity';
import { HandicapRequest } from '../parking/entities/handicap-request.entity';
import { HandicapLegitimation } from '../parking/entities/handicap-legitimation.entity';
import { RevolutionarLegitimation } from '../parking/entities/revolutionar-legitimation.entity';
import { DomiciliuRequest } from '../parking/entities/domiciliu-request.entity';
import { ControlSesizare } from '../parking/entities/control-sesizare.entity';
import { LeaveRequest } from '../leave-requests/entities/leave-request.entity';
import { ShiftSwapRequest } from '../shift-swaps/entities/shift-swap-request.entity';
import { Department } from '../departments/entities/department.entity';
import { HttpCacheInterceptor, CacheTTL } from '../../common/interceptors/cache.interceptor';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
}

// Static page definitions for quick-navigation search
const PAGES: { label: string; path: string; keywords: string[] }[] = [
  { label: 'Dashboard', path: '/dashboard', keywords: ['dashboard', 'acasa', 'home', 'panou'] },
  { label: 'Programul Meu', path: '/my-schedule', keywords: ['program', 'orar', 'schedule'] },
  { label: 'Raport Zilnic', path: '/daily-reports', keywords: ['raport', 'zilnic', 'daily'] },
  { label: 'Schimburi Ture', path: '/shift-swaps', keywords: ['schimb', 'tura', 'swap'] },
  { label: 'Concedii', path: '/leave-requests', keywords: ['concediu', 'vacanta', 'leave'] },
  { label: 'Programe', path: '/schedules', keywords: ['programe', 'grafic', 'schedule'] },
  { label: 'Gestionare Schimburi', path: '/admin/shift-swaps', keywords: ['gestionare', 'schimb', 'admin'] },
  { label: 'Gestionare Concedii', path: '/admin/leave-requests', keywords: ['gestionare', 'concediu', 'admin'] },
  { label: 'Rapoarte', path: '/reports', keywords: ['raport', 'rapoarte', 'statistici', 'reports'] },
  { label: 'Utilizatori', path: '/users', keywords: ['utilizator', 'utilizatori', 'angajat', 'angajati', 'user'] },
  { label: 'Monitorizare Pontaj', path: '/admin/pontaj', keywords: ['pontaj', 'prezenta', 'time'] },
  { label: 'Editari Solicitate', path: '/admin/edit-requests', keywords: ['editari', 'solicitate', 'edit'] },
  { label: 'Permisiuni', path: '/admin/permissions', keywords: ['permisiuni', 'setari', 'permissions'] },
  { label: 'Parcari Etajate', path: '/parking', keywords: ['parcari', 'etajate', 'parking', 'parcare'] },
  { label: 'Parcari Handicap', path: '/parking/handicap', keywords: ['handicap', 'dizabilitat'] },
  { label: 'Parcari Domiciliu', path: '/parking/domiciliu', keywords: ['domiciliu', 'rezident'] },
  { label: 'PV / Facturare', path: '/procese-verbale', keywords: ['proces', 'verbal', 'factura', 'pv', 'facturare'] },
  { label: 'Parcometre', path: '/parcometre', keywords: ['parcometru', 'parcometre'] },
  { label: 'Achizitii', path: '/achizitii', keywords: ['achizitii', 'achizitie', 'cumparare'] },
  { label: 'Incasari / Cheltuieli', path: '/incasari-cheltuieli', keywords: ['incasari', 'cheltuieli', 'venit', 'venituri'] },
  { label: 'Control Sesizari', path: '/control-sesizari', keywords: ['control', 'sesizare', 'sesizari'] },
  { label: 'Profil', path: '/profile', keywords: ['profil', 'cont', 'profile'] },
  { label: 'Notificari', path: '/notifications', keywords: ['notificare', 'notificari', 'notifications'] },
];

@Controller('search')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 searches per minute
export class SearchController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ParkingIssue)
    private readonly parkingIssueRepo: Repository<ParkingIssue>,
    @InjectRepository(ParkingDamage)
    private readonly parkingDamageRepo: Repository<ParkingDamage>,
    @InjectRepository(HandicapRequest)
    private readonly handicapRequestRepo: Repository<HandicapRequest>,
    @InjectRepository(HandicapLegitimation)
    private readonly handicapLegitimationRepo: Repository<HandicapLegitimation>,
    @InjectRepository(RevolutionarLegitimation)
    private readonly revolutionarLegitimationRepo: Repository<RevolutionarLegitimation>,
    @InjectRepository(DomiciliuRequest)
    private readonly domiciliuRequestRepo: Repository<DomiciliuRequest>,
    @InjectRepository(ControlSesizare)
    private readonly controlSesizareRepo: Repository<ControlSesizare>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(ShiftSwapRequest)
    private readonly shiftSwapRepo: Repository<ShiftSwapRequest>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  @Get()
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(15) // Cache search results for 15 seconds
  async search(@Query('q') query: string, @Req() req: any): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const q = query.trim();
    const qLower = q.toLowerCase();
    const results: SearchResult[] = [];

    // 1. Page navigation (static, instant — no DB)
    const pageResults = PAGES.filter(p =>
      p.label.toLowerCase().includes(qLower) ||
      p.keywords.some(k => k.includes(qLower))
    ).slice(0, 5);

    pageResults.forEach(p => {
      results.push({
        type: 'page',
        id: p.path,
        title: p.label,
        subtitle: p.path,
        url: p.path,
      });
    });

    // 2. Search users
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

    // 3. Search departments
    const departments = await this.departmentRepo.find({
      where: [{ name: ILike(`%${q}%`) }],
      take: 2,
      relations: ['manager'],
    });
    departments.forEach(d => {
      results.push({
        type: 'department',
        id: d.id,
        title: d.name,
        subtitle: d.manager ? `Manager: ${d.manager.fullName}` : 'Fara manager',
        url: `/users`,
      });
    });

    // 4. Search parking issues
    const issues = await this.parkingIssueRepo.find({
      where: [
        { description: ILike(`%${q}%`) },
        { equipment: ILike(`%${q}%`) },
        { contactedCompany: ILike(`%${q}%`) },
      ],
      take: 3,
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

    // 5. Search parking damages
    const damages = await this.parkingDamageRepo.find({
      where: [
        { damagedEquipment: ILike(`%${q}%`) },
        { personName: ILike(`%${q}%`) },
        { carPlate: ILike(`%${q}%`) },
        { description: ILike(`%${q}%`) },
      ],
      take: 3,
      relations: ['parkingLot'],
      order: { createdAt: 'DESC' },
    });
    damages.forEach(d => {
      results.push({
        type: 'parking_damage',
        id: d.id,
        title: `Prejudiciu: ${d.damagedEquipment || d.carPlate}`,
        subtitle: `${d.personName} - ${d.status}`,
        url: `/parking`,
      });
    });

    // 6. Search handicap requests
    const handicapReqs = await this.handicapRequestRepo.find({
      where: [
        { personName: ILike(`%${q}%`) },
        { location: ILike(`%${q}%`) },
        { carPlate: ILike(`%${q}%`) },
        { description: ILike(`%${q}%`) },
      ],
      take: 3,
      order: { createdAt: 'DESC' },
    });
    handicapReqs.forEach(h => {
      results.push({
        type: 'handicap_request',
        id: h.id,
        title: `Solicitare HC: ${h.personName || h.location}`,
        subtitle: `${h.location || 'N/A'} - ${h.status}`,
        url: `/parking/handicap`,
      });
    });

    // 7. Search handicap legitimations
    const handicapLegs = await this.handicapLegitimationRepo.find({
      where: [
        { personName: ILike(`%${q}%`) },
        { carPlate: ILike(`%${q}%`) },
        { handicapCertificateNumber: ILike(`%${q}%`) },
      ],
      take: 3,
      order: { createdAt: 'DESC' },
    });
    handicapLegs.forEach(h => {
      results.push({
        type: 'handicap_legitimation',
        id: h.id,
        title: `Legitimatie HC: ${h.personName}`,
        subtitle: `${h.carPlate} - ${h.status}`,
        url: `/parking/handicap`,
      });
    });

    // 8. Search revolutionar legitimations
    const revLegs = await this.revolutionarLegitimationRepo.find({
      where: [
        { personName: ILike(`%${q}%`) },
        { carPlate: ILike(`%${q}%`) },
        { lawNumber: ILike(`%${q}%`) },
      ],
      take: 3,
      order: { createdAt: 'DESC' },
    });
    revLegs.forEach(r => {
      results.push({
        type: 'revolutionar_legitimation',
        id: r.id,
        title: `Legitimatie Rev: ${r.personName}`,
        subtitle: `${r.carPlate} - ${r.status}`,
        url: `/parking/handicap`,
      });
    });

    // 9. Search domiciliu requests
    const domReqs = await this.domiciliuRequestRepo.find({
      where: [
        { personName: ILike(`%${q}%`) },
        { location: ILike(`%${q}%`) },
        { carPlate: ILike(`%${q}%`) },
        { address: ILike(`%${q}%`) },
      ],
      take: 3,
      order: { createdAt: 'DESC' },
    });
    domReqs.forEach(d => {
      results.push({
        type: 'domiciliu_request',
        id: d.id,
        title: `Domiciliu: ${d.personName || d.location}`,
        subtitle: `${d.location || 'N/A'} - ${d.status}`,
        url: `/parking/domiciliu`,
      });
    });

    // 10. Search control sesizari
    const sesizari = await this.controlSesizareRepo.find({
      where: [
        { location: ILike(`%${q}%`) },
        { description: ILike(`%${q}%`) },
      ],
      take: 3,
      order: { createdAt: 'DESC' },
    });
    sesizari.forEach(s => {
      results.push({
        type: 'control_sesizare',
        id: s.id,
        title: `Sesizare: ${s.location || s.type}`,
        subtitle: `${s.zone} - ${s.status}`,
        url: `/control-sesizari`,
      });
    });

    // 11. Search leave requests
    const leaves = await this.leaveRepo.find({
      where: [
        { reason: ILike(`%${q}%`) },
      ],
      take: 3,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    leaves.forEach(l => {
      results.push({
        type: 'leave_request',
        id: l.id,
        title: `Concediu: ${l.user?.fullName || 'N/A'}`,
        subtitle: `${l.leaveType} - ${l.status}`,
        url: `/leave-requests`,
      });
    });

    // 12. Search shift swap requests
    const swaps = await this.shiftSwapRepo.find({
      where: [
        { reason: ILike(`%${q}%`) },
      ],
      take: 3,
      relations: ['requester'],
      order: { createdAt: 'DESC' },
    });
    swaps.forEach(s => {
      results.push({
        type: 'shift_swap',
        id: s.id,
        title: `Schimb: ${s.requester?.fullName || 'N/A'}`,
        subtitle: `${s.requesterDate} - ${s.status}`,
        url: `/shift-swaps`,
      });
    });

    return results.slice(0, 20);
  }
}
