import { Controller, Get, Query, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Brackets } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
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
import {
  DISPECERAT_DEPARTMENT_NAME,
  CONTROL_DEPARTMENT_NAME,
  MAINTENANCE_DEPARTMENT_NAME,
  HANDICAP_PARKING_DEPARTMENT_NAME,
  DOMICILIU_PARKING_DEPARTMENT_NAME,
  PROCESE_VERBALE_DEPARTMENT_NAME,
  PARCOMETRE_DEPARTMENT_NAME,
  ACHIZITII_DEPARTMENT_NAME,
} from '../parking/constants/parking.constants';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
}

// Access rule — mirrors sidebar filtering logic from MainLayout.tsx
interface AccessRule {
  roles: UserRole[];
  requiresDepartments?: string[];
  excludeDepartments?: string[];
}

// Departments excluded from Programul Meu (also used in NO_SHIFT_SWAP_DEPARTMENTS)
const PARKING_ONLY_DEPARTMENTS = [
  MAINTENANCE_DEPARTMENT_NAME,
  HANDICAP_PARKING_DEPARTMENT_NAME,
  DOMICILIU_PARKING_DEPARTMENT_NAME,
];

// Departments that don't see Schimburi Ture
const NO_SHIFT_SWAP_DEPARTMENTS = [
  ...PARKING_ONLY_DEPARTMENTS,
  PROCESE_VERBALE_DEPARTMENT_NAME,
  PARCOMETRE_DEPARTMENT_NAME,
  ACHIZITII_DEPARTMENT_NAME,
];

// ── Access rules per category (mirrors menuItems from MainLayout.tsx) ──

const ACCESS_ALL: AccessRule = {
  roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
};

const ACCESS_MY_SCHEDULE: AccessRule = {
  roles: [UserRole.USER, UserRole.MANAGER],
  excludeDepartments: PARKING_ONLY_DEPARTMENTS,
};

const ACCESS_SHIFT_SWAPS: AccessRule = {
  roles: [UserRole.USER, UserRole.MANAGER],
  excludeDepartments: NO_SHIFT_SWAP_DEPARTMENTS,
};

const ACCESS_LEAVE: AccessRule = {
  roles: [UserRole.USER, UserRole.MANAGER],
};

const ACCESS_SCHEDULES: AccessRule = {
  roles: [UserRole.ADMIN, UserRole.MANAGER],
};

const ACCESS_ADMIN: AccessRule = {
  roles: [UserRole.ADMIN],
};

const ACCESS_MASTER_ADMIN: AccessRule = {
  roles: [UserRole.MASTER_ADMIN],
};

const ACCESS_PARKING: AccessRule = {
  roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  requiresDepartments: [DISPECERAT_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME],
  excludeDepartments: [HANDICAP_PARKING_DEPARTMENT_NAME, DOMICILIU_PARKING_DEPARTMENT_NAME],
};

const ACCESS_HANDICAP: AccessRule = {
  roles: [UserRole.ADMIN, UserRole.USER],
  requiresDepartments: [MAINTENANCE_DEPARTMENT_NAME, HANDICAP_PARKING_DEPARTMENT_NAME, DOMICILIU_PARKING_DEPARTMENT_NAME],
};

const ACCESS_DOMICILIU: AccessRule = {
  roles: [UserRole.ADMIN, UserRole.USER],
  requiresDepartments: [MAINTENANCE_DEPARTMENT_NAME, HANDICAP_PARKING_DEPARTMENT_NAME, DOMICILIU_PARKING_DEPARTMENT_NAME],
};

const ACCESS_PV: AccessRule = {
  roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  requiresDepartments: [PROCESE_VERBALE_DEPARTMENT_NAME, CONTROL_DEPARTMENT_NAME],
};

const ACCESS_PARCOMETRE: AccessRule = {
  roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  requiresDepartments: [PARCOMETRE_DEPARTMENT_NAME],
};

const ACCESS_ACHIZITII: AccessRule = {
  roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  requiresDepartments: [ACHIZITII_DEPARTMENT_NAME],
};

const ACCESS_CONTROL: AccessRule = {
  roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  requiresDepartments: [CONTROL_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME],
};

// Static page definitions with access rules
const PAGES: { label: string; path: string; keywords: string[]; access: AccessRule }[] = [
  { label: 'Dashboard', path: '/dashboard', keywords: ['dashboard', 'acasa', 'home', 'panou'], access: ACCESS_ALL },
  { label: 'Programul Meu', path: '/my-schedule', keywords: ['program', 'orar', 'schedule'], access: ACCESS_MY_SCHEDULE },
  { label: 'Raport Zilnic', path: '/daily-reports', keywords: ['raport', 'zilnic', 'daily'], access: ACCESS_ALL },
  { label: 'Schimburi Ture', path: '/shift-swaps', keywords: ['schimb', 'tura', 'swap'], access: ACCESS_SHIFT_SWAPS },
  { label: 'Concedii', path: '/leave-requests', keywords: ['concediu', 'vacanta', 'leave'], access: ACCESS_LEAVE },
  { label: 'Programe', path: '/schedules', keywords: ['programe', 'grafic', 'schedule'], access: ACCESS_SCHEDULES },
  { label: 'Gestionare Schimburi', path: '/admin/shift-swaps', keywords: ['gestionare', 'schimb', 'admin'], access: ACCESS_ADMIN },
  { label: 'Gestionare Concedii', path: '/admin/leave-requests', keywords: ['gestionare', 'concediu', 'admin'], access: ACCESS_ADMIN },
  { label: 'Rapoarte', path: '/reports', keywords: ['raport', 'rapoarte', 'statistici', 'reports'], access: ACCESS_ADMIN },
  { label: 'Utilizatori', path: '/users', keywords: ['utilizator', 'utilizatori', 'angajat', 'angajati', 'user'], access: ACCESS_ADMIN },
  { label: 'Monitorizare Pontaj', path: '/admin/pontaj', keywords: ['pontaj', 'prezenta', 'time'], access: ACCESS_ADMIN },
  { label: 'Editari Solicitate', path: '/admin/edit-requests', keywords: ['editari', 'solicitate', 'edit'], access: ACCESS_ADMIN },
  { label: 'Permisiuni', path: '/admin/permissions', keywords: ['permisiuni', 'setari', 'permissions'], access: ACCESS_MASTER_ADMIN },
  { label: 'Parcari Etajate', path: '/parking', keywords: ['parcari', 'etajate', 'parking', 'parcare'], access: ACCESS_PARKING },
  { label: 'Parcari Handicap', path: '/parking/handicap', keywords: ['handicap', 'dizabilitat'], access: ACCESS_HANDICAP },
  { label: 'Parcari Domiciliu', path: '/parking/domiciliu', keywords: ['domiciliu', 'rezident'], access: ACCESS_DOMICILIU },
  { label: 'PV / Facturare', path: '/procese-verbale', keywords: ['proces', 'verbal', 'factura', 'pv', 'facturare'], access: ACCESS_PV },
  { label: 'Parcometre', path: '/parcometre', keywords: ['parcometru', 'parcometre'], access: ACCESS_PARCOMETRE },
  { label: 'Achizitii', path: '/achizitii', keywords: ['achizitii', 'achizitie', 'cumparare'], access: ACCESS_ACHIZITII },
  { label: 'Incasari / Cheltuieli', path: '/incasari-cheltuieli', keywords: ['incasari', 'cheltuieli', 'venit', 'venituri'], access: ACCESS_ACHIZITII },
  { label: 'Control Sesizari', path: '/control-sesizari', keywords: ['control', 'sesizare', 'sesizari'], access: ACCESS_CONTROL },
  { label: 'Profil', path: '/profile', keywords: ['profil', 'cont', 'profile'], access: ACCESS_ALL },
  { label: 'Notificari', path: '/notifications', keywords: ['notificare', 'notificari', 'notifications'], access: ACCESS_ALL },
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

  /**
   * Mirrors sidebar filtering logic from MainLayout.tsx (lines 299-336).
   * Determines if a user can access a given resource based on role + department.
   */
  private canAccess(user: User, rule: AccessRule): boolean {
    // 1. Role check (MASTER_ADMIN can see ADMIN items hierarchically)
    const roleMatches = rule.roles.includes(user.role) ||
      (user.role === UserRole.MASTER_ADMIN && rule.roles.includes(UserRole.ADMIN));
    if (!roleMatches) return false;

    // 2. ADMIN and MASTER_ADMIN see everything
    if (user.role === UserRole.ADMIN || user.role === UserRole.MASTER_ADMIN) return true;

    const dept = user.department?.name || '';

    // 3. MANAGER: exclude departments check only
    if (user.role === UserRole.MANAGER) {
      if (rule.excludeDepartments && rule.excludeDepartments.includes(dept)) return false;
      return true;
    }

    // 4. USER: full checks
    if (rule.excludeDepartments && rule.excludeDepartments.includes(dept)) return false;
    if (rule.requiresDepartments) return rule.requiresDepartments.includes(dept);
    return true;
  }

  private formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    if (typeof date === 'string') return date;
    try {
      return date.toISOString().split('T')[0];
    } catch {
      return 'N/A';
    }
  }

  @Get()
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(15) // Cache search results for 15 seconds
  async search(@Query('q') query: string, @Req() req: { user: User }): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const q = query.trim();
    const qLower = q.toLowerCase();
    const user: User = req.user;
    const results: SearchResult[] = [];

    // 1. Page navigation (static, instant — no DB) — filtered by access
    const pageResults = PAGES
      .filter(p => this.canAccess(user, p.access))
      .filter(p =>
        p.label.toLowerCase().includes(qLower) ||
        p.keywords.some(k => k.includes(qLower))
      )
      .slice(0, 5);

    pageResults.forEach(p => {
      results.push({
        type: 'page',
        id: p.path,
        title: p.label,
        subtitle: p.path,
        url: p.path,
      });
    });

    // 2. Run DB queries in parallel — skip queries user has no access to
    const empty = Promise.resolve([] as any[]);

    const [
      users,
      departments,
      issues,
      damages,
      handicapReqs,
      handicapLegs,
      revLegs,
      domReqs,
      sesizari,
      leaves,
      swaps,
    ] = await Promise.all([
      // Users — ADMIN only
      this.canAccess(user, ACCESS_ADMIN)
        ? this.userRepo.find({
            where: [
              { fullName: ILike(`%${q}%`) },
              { email: ILike(`%${q}%`) },
            ],
            take: 5,
            relations: ['department'],
          })
        : empty,
      // Departments — ADMIN only
      this.canAccess(user, ACCESS_ADMIN)
        ? this.departmentRepo.find({
            where: [{ name: ILike(`%${q}%`) }],
            take: 2,
            relations: ['manager'],
          })
        : empty,
      // Parking issues — same as Parcari Etajate
      this.canAccess(user, ACCESS_PARKING)
        ? this.parkingIssueRepo.find({
            where: [
              { description: ILike(`%${q}%`) },
              { equipment: ILike(`%${q}%`) },
              { contactedCompany: ILike(`%${q}%`) },
            ],
            take: 3,
            relations: ['parkingLot'],
            order: { createdAt: 'DESC' },
          })
        : empty,
      // Parking damages — same as Parcari Etajate
      this.canAccess(user, ACCESS_PARKING)
        ? this.parkingDamageRepo.find({
            where: [
              { damagedEquipment: ILike(`%${q}%`) },
              { personName: ILike(`%${q}%`) },
              { carPlate: ILike(`%${q}%`) },
              { description: ILike(`%${q}%`) },
            ],
            take: 3,
            relations: ['parkingLot'],
            order: { createdAt: 'DESC' },
          })
        : empty,
      // Handicap requests — same as Parcari Handicap
      this.canAccess(user, ACCESS_HANDICAP)
        ? this.handicapRequestRepo.find({
            where: [
              { personName: ILike(`%${q}%`) },
              { location: ILike(`%${q}%`) },
              { carPlate: ILike(`%${q}%`) },
              { description: ILike(`%${q}%`) },
            ],
            take: 3,
            order: { createdAt: 'DESC' },
          })
        : empty,
      // Handicap legitimations — same as Parcari Handicap
      this.canAccess(user, ACCESS_HANDICAP)
        ? this.handicapLegitimationRepo.find({
            where: [
              { personName: ILike(`%${q}%`) },
              { carPlate: ILike(`%${q}%`) },
              { handicapCertificateNumber: ILike(`%${q}%`) },
            ],
            take: 3,
            order: { createdAt: 'DESC' },
          })
        : empty,
      // Revolutionar legitimations — same as Parcari Handicap
      this.canAccess(user, ACCESS_HANDICAP)
        ? this.revolutionarLegitimationRepo.find({
            where: [
              { personName: ILike(`%${q}%`) },
              { carPlate: ILike(`%${q}%`) },
              { lawNumber: ILike(`%${q}%`) },
            ],
            take: 3,
            order: { createdAt: 'DESC' },
          })
        : empty,
      // Domiciliu requests — same as Parcari Domiciliu
      this.canAccess(user, ACCESS_DOMICILIU)
        ? this.domiciliuRequestRepo.find({
            where: [
              { personName: ILike(`%${q}%`) },
              { location: ILike(`%${q}%`) },
              { carPlate: ILike(`%${q}%`) },
              { address: ILike(`%${q}%`) },
            ],
            take: 3,
            order: { createdAt: 'DESC' },
          })
        : empty,
      // Control sesizari
      this.canAccess(user, ACCESS_CONTROL)
        ? this.controlSesizareRepo.find({
            where: [
              { location: ILike(`%${q}%`) },
              { description: ILike(`%${q}%`) },
            ],
            take: 3,
            order: { createdAt: 'DESC' },
          })
        : empty,
      // Leave requests — search by reason and user name; USER/MANAGER see only own
      this.canAccess(user, ACCESS_LEAVE)
        ? (() => {
            const qb = this.leaveRepo.createQueryBuilder('lr')
              .leftJoinAndSelect('lr.user', 'user')
              .where(new Brackets(sub =>
                sub.where('lr.reason ILIKE :q', { q: `%${q}%` })
                   .orWhere('user.fullName ILIKE :q', { q: `%${q}%` }),
              ))
              .orderBy('lr.createdAt', 'DESC')
              .take(3);
            if (user.role !== UserRole.ADMIN && user.role !== UserRole.MASTER_ADMIN) {
              qb.andWhere('lr.userId = :userId', { userId: user.id });
            }
            return qb.getMany();
          })()
        : empty,
      // Shift swap requests — search by reason and requester name; USER/MANAGER see only own
      this.canAccess(user, ACCESS_SHIFT_SWAPS)
        ? (() => {
            const qb = this.shiftSwapRepo.createQueryBuilder('ss')
              .leftJoinAndSelect('ss.requester', 'requester')
              .where(new Brackets(sub =>
                sub.where('ss.reason ILIKE :q', { q: `%${q}%` })
                   .orWhere('requester.fullName ILIKE :q', { q: `%${q}%` }),
              ))
              .orderBy('ss.createdAt', 'DESC')
              .take(3);
            if (user.role !== UserRole.ADMIN && user.role !== UserRole.MASTER_ADMIN) {
              qb.andWhere('ss.requesterId = :userId', { userId: user.id });
            }
            return qb.getMany();
          })()
        : empty,
    ]);

    // Map users
    (users as User[]).forEach((u) => {
      results.push({
        type: 'user',
        id: u.id,
        title: u.fullName,
        subtitle: `${u.email} - ${u.department?.name || u.role}`,
        url: `/users`,
      });
    });

    // Map departments
    (departments as Department[]).forEach((d) => {
      results.push({
        type: 'department',
        id: d.id,
        title: d.name,
        subtitle: d.manager ? `Manager: ${d.manager.fullName}` : 'Fara manager',
        url: `/users`,
      });
    });

    // Map parking issues
    (issues as ParkingIssue[]).forEach((i) => {
      results.push({
        type: 'parking_issue',
        id: i.id,
        title: `Problema: ${i.equipment || 'N/A'}`,
        subtitle: `${i.parkingLot?.name || 'N/A'} - ${i.status}`,
        url: `/parking`,
      });
    });

    // Map parking damages
    (damages as ParkingDamage[]).forEach((d) => {
      results.push({
        type: 'parking_damage',
        id: d.id,
        title: `Prejudiciu: ${d.damagedEquipment || d.carPlate}`,
        subtitle: `${d.personName} - ${d.status}`,
        url: `/parking`,
      });
    });

    // Map handicap requests
    (handicapReqs as HandicapRequest[]).forEach((h) => {
      results.push({
        type: 'handicap_request',
        id: h.id,
        title: `Solicitare HC: ${h.personName || h.location}`,
        subtitle: `${h.location || 'N/A'} - ${h.status}`,
        url: `/parking/handicap`,
      });
    });

    // Map handicap legitimations
    (handicapLegs as HandicapLegitimation[]).forEach((h) => {
      results.push({
        type: 'handicap_legitimation',
        id: h.id,
        title: `Legitimatie HC: ${h.personName}`,
        subtitle: `${h.carPlate} - ${h.status}`,
        url: `/parking/handicap`,
      });
    });

    // Map revolutionar legitimations
    (revLegs as RevolutionarLegitimation[]).forEach((r) => {
      results.push({
        type: 'revolutionar_legitimation',
        id: r.id,
        title: `Legitimatie Rev: ${r.personName}`,
        subtitle: `${r.carPlate} - ${r.status}`,
        url: `/parking/handicap`,
      });
    });

    // Map domiciliu requests
    (domReqs as DomiciliuRequest[]).forEach((d) => {
      results.push({
        type: 'domiciliu_request',
        id: d.id,
        title: `Domiciliu: ${d.personName || d.location}`,
        subtitle: `${d.location || 'N/A'} - ${d.status}`,
        url: `/parking/domiciliu`,
      });
    });

    // Map control sesizari
    (sesizari as ControlSesizare[]).forEach((s) => {
      results.push({
        type: 'control_sesizare',
        id: s.id,
        title: `Sesizare: ${s.location || s.type}`,
        subtitle: `${s.zone} - ${s.status}`,
        url: `/control-sesizari`,
      });
    });

    // Map leave requests
    (leaves as LeaveRequest[]).forEach((l) => {
      results.push({
        type: 'leave_request',
        id: l.id,
        title: `Concediu: ${l.user?.fullName || 'N/A'}`,
        subtitle: `${l.leaveType} - ${l.status}`,
        url: `/leave-requests`,
      });
    });

    // Map shift swap requests
    (swaps as ShiftSwapRequest[]).forEach((s) => {
      results.push({
        type: 'shift_swap',
        id: s.id,
        title: `Schimb: ${s.requester?.fullName || 'N/A'}`,
        subtitle: `${this.formatDate(s.requesterDate)} - ${s.status}`,
        url: `/shift-swaps`,
      });
    });

    return results.slice(0, 20);
  }
}
