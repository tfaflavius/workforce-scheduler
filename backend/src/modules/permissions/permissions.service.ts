import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { UserPermissionOverride } from './entities/user-permission-override.entity';
import { TaskFlowRule } from './entities/task-flow-rule.entity';
import { Department } from '../departments/entities/department.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { RESOURCE_DEFINITIONS } from './constants/resources';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(UserPermissionOverride)
    private readonly overrideRepo: Repository<UserPermissionOverride>,
    @InjectRepository(TaskFlowRule)
    private readonly taskFlowRepo: Repository<TaskFlowRule>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ─── Permission Matrix ───────────────────────────────────────────────

  async getMatrix() {
    const permissions = await this.permissionRepo.find({
      relations: ['department'],
      order: { resourceKey: 'ASC', action: 'ASC', role: 'ASC' },
    });

    const matrix: Record<
      string,
      Record<string, Record<string, Record<string, { id: string; allowed: boolean }>>>
    > = {};

    for (const perm of permissions) {
      const deptKey = perm.departmentId || 'null';

      if (!matrix[perm.resourceKey]) matrix[perm.resourceKey] = {};
      if (!matrix[perm.resourceKey][perm.action]) matrix[perm.resourceKey][perm.action] = {};
      if (!matrix[perm.resourceKey][perm.action][perm.role])
        matrix[perm.resourceKey][perm.action][perm.role] = {};

      matrix[perm.resourceKey][perm.action][perm.role][deptKey] = {
        id: perm.id,
        allowed: perm.allowed,
      };
    }

    return matrix;
  }

  async bulkUpdate(updates: { id: string; allowed: boolean }[]) {
    const ids = updates.map((u) => u.id);
    const permissions = await this.permissionRepo.find({ where: { id: In(ids) } });

    const permMap = new Map(permissions.map((p) => [p.id, p]));

    for (const update of updates) {
      const perm = permMap.get(update.id);
      if (perm) {
        perm.allowed = update.allowed;
      }
    }

    await this.permissionRepo.save(permissions);
    return { updated: permissions.length };
  }

  async updateOne(id: string, allowed: boolean) {
    const permission = await this.permissionRepo.findOne({ where: { id } });
    if (!permission) {
      throw new NotFoundException(`Permission ${id} not found`);
    }
    permission.allowed = allowed;
    return this.permissionRepo.save(permission);
  }

  // ─── User Overrides ──────────────────────────────────────────────────

  async getUserOverrides(userId: string) {
    return this.overrideRepo.find({
      where: { userId },
      order: { resourceKey: 'ASC', action: 'ASC' },
    });
  }

  async setUserOverrides(
    userId: string,
    overrides: { resourceKey: string; action: string; allowed: boolean }[],
  ) {
    // Remove existing overrides for this user
    await this.overrideRepo.delete({ userId });

    if (overrides.length === 0) {
      return [];
    }

    const entities = overrides.map((o) =>
      this.overrideRepo.create({
        userId,
        resourceKey: o.resourceKey,
        action: o.action,
        allowed: o.allowed,
      }),
    );

    return this.overrideRepo.save(entities);
  }

  async removeUserOverride(id: string) {
    const override = await this.overrideRepo.findOne({ where: { id } });
    if (!override) {
      throw new NotFoundException(`Override ${id} not found`);
    }
    await this.overrideRepo.remove(override);
    return { deleted: true };
  }

  // ─── Effective Permissions ────────────────────────────────────────────

  async getEffectivePermissions(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['department'],
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Get default permissions for the user's role
    const defaultPerms = await this.permissionRepo.find({
      where: [
        { role: user.role, departmentId: null as any },
        ...(user.departmentId
          ? [{ role: user.role, departmentId: user.departmentId }]
          : []),
      ],
    });

    // Get user-specific overrides
    const overrides = await this.overrideRepo.find({ where: { userId } });

    // Build effective map: resourceKey:action -> allowed
    const effective: Record<string, boolean> = {};

    for (const perm of defaultPerms) {
      const key = `${perm.resourceKey}:${perm.action}`;
      effective[key] = perm.allowed;
    }

    // Overrides take precedence
    for (const override of overrides) {
      const key = `${override.resourceKey}:${override.action}`;
      effective[key] = override.allowed;
    }

    return {
      userId: user.id,
      role: user.role,
      departmentId: user.departmentId,
      permissions: effective,
    };
  }

  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return false;

    // Check user-specific override first
    const override = await this.overrideRepo.findOne({
      where: { userId, resourceKey: resource, action },
    });
    if (override) return override.allowed;

    // Check department-specific permission
    if (user.departmentId) {
      const deptPerm = await this.permissionRepo.findOne({
        where: { resourceKey: resource, action, role: user.role, departmentId: user.departmentId },
      });
      if (deptPerm) return deptPerm.allowed;
    }

    // Check role-level permission (departmentId = null)
    const rolePerm = await this.permissionRepo.findOne({
      where: { resourceKey: resource, action, role: user.role, departmentId: null as any },
    });
    if (rolePerm) return rolePerm.allowed;

    return false;
  }

  // ─── Task Flow Rules ──────────────────────────────────────────────────

  async getTaskFlows() {
    return this.taskFlowRepo.find({
      relations: ['creatorDepartment', 'receiverDepartment', 'resolverDepartment'],
      order: { taskType: 'ASC' },
    });
  }

  async createTaskFlow(data: Partial<TaskFlowRule>) {
    const rule = this.taskFlowRepo.create(data);
    return this.taskFlowRepo.save(rule);
  }

  async updateTaskFlow(id: string, data: Partial<TaskFlowRule>) {
    const rule = await this.taskFlowRepo.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`TaskFlowRule ${id} not found`);
    }
    Object.assign(rule, data);
    return this.taskFlowRepo.save(rule);
  }

  async deleteTaskFlow(id: string) {
    const rule = await this.taskFlowRepo.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`TaskFlowRule ${id} not found`);
    }
    await this.taskFlowRepo.remove(rule);
    return { deleted: true };
  }

  // ─── Summary ──────────────────────────────────────────────────────────

  async getSummary() {
    const permissions = await this.permissionRepo.find();

    const summary: Record<string, { total: number; allowed: number; denied: number }> = {};

    for (const role of Object.values(UserRole)) {
      const rolePerms = permissions.filter((p) => p.role === role);
      summary[role] = {
        total: rolePerms.length,
        allowed: rolePerms.filter((p) => p.allowed).length,
        denied: rolePerms.filter((p) => !p.allowed).length,
      };
    }

    return summary;
  }

  // ─── Seed Defaults ────────────────────────────────────────────────────

  async seedDefaults() {
    await this.seedPermissions();
    await this.seedTaskFlows();
    return { message: 'Permissions and task flows seeded successfully' };
  }

  private async seedPermissions() {
    // Clear existing permissions
    await this.permissionRepo.clear();

    const permissionsToCreate: Partial<Permission>[] = [];

    // ── MASTER_ADMIN: all resources, all actions, allowed ──
    for (const resource of RESOURCE_DEFINITIONS) {
      for (const action of resource.actions) {
        permissionsToCreate.push({
          resourceKey: resource.key,
          action,
          role: UserRole.MASTER_ADMIN,
          departmentId: null,
          allowed: true,
        });
      }
    }

    // ── ADMIN: all resources, all actions, allowed ──
    for (const resource of RESOURCE_DEFINITIONS) {
      for (const action of resource.actions) {
        permissionsToCreate.push({
          resourceKey: resource.key,
          action,
          role: UserRole.ADMIN,
          departmentId: null,
          allowed: true,
        });
      }
    }

    // ── MANAGER: department-independent ──
    const managerAllowed: Record<string, string[]> = {
      'dashboard': ['view'],
      'my-schedule': ['view'],
      'daily-reports': ['view', 'create', 'edit'],
      'shift-swaps': ['view', 'create'],
      'leave-requests': ['view', 'create'],
      'schedules': ['view', 'create', 'edit', 'delete'],
      'parking.issues': ['view', 'create', 'edit', 'resolve'],
      'parking.damages': ['view', 'create', 'edit', 'resolve'],
      'parking.payment-machines': ['view', 'create', 'edit'],
      'parking.stats': ['view', 'edit'],
      'parking.handicap': ['view', 'create', 'edit', 'resolve'],
      'parking.domiciliu': ['view', 'create', 'edit', 'resolve'],
      'pv-facturare': ['view', 'create', 'edit'],
      'parcometre': ['view', 'create', 'edit'],
      'achizitii': ['view', 'create', 'edit'],
      'incasari-cheltuieli': ['view', 'create', 'edit'],
      'control-sesizari': ['view', 'create', 'resolve'],
    };

    const managerDenied = ['users', 'reports', 'shift-swaps.admin', 'leave-requests.admin', 'time-tracking', 'permissions'];

    for (const resource of RESOURCE_DEFINITIONS) {
      for (const action of resource.actions) {
        const allowedActions = managerAllowed[resource.key];
        const isDeniedResource = managerDenied.includes(resource.key);

        let allowed: boolean;
        if (isDeniedResource) {
          allowed = false;
        } else if (allowedActions && allowedActions.includes(action)) {
          allowed = true;
        } else {
          allowed = false;
        }

        permissionsToCreate.push({
          resourceKey: resource.key,
          action,
          role: UserRole.MANAGER,
          departmentId: null,
          allowed,
        });
      }
    }

    // ── USER: department-independent resources ──
    const userGeneralAllowed: Record<string, string[]> = {
      'dashboard': ['view'],
      'my-schedule': ['view'],
      'daily-reports': ['view', 'create', 'edit'],
      'shift-swaps': ['view', 'create'],
      'leave-requests': ['view', 'create'],
      'schedules': ['view'],
    };

    const userAlwaysDenied = [
      'users', 'reports', 'shift-swaps.admin', 'leave-requests.admin',
      'time-tracking', 'permissions',
    ];

    // First, add department-independent USER permissions
    const departmentIndependentResources = [
      'dashboard', 'my-schedule', 'daily-reports', 'shift-swaps',
      'leave-requests', 'schedules',
      ...userAlwaysDenied,
    ];

    for (const resourceKey of departmentIndependentResources) {
      const resource = RESOURCE_DEFINITIONS.find((r) => r.key === resourceKey);
      if (!resource) continue;

      for (const action of resource.actions) {
        const allowedActions = userGeneralAllowed[resourceKey];
        const isDenied = userAlwaysDenied.includes(resourceKey);
        let allowed: boolean;

        if (isDenied) {
          allowed = false;
        } else if (allowedActions && allowedActions.includes(action)) {
          allowed = true;
        } else {
          allowed = false;
        }

        permissionsToCreate.push({
          resourceKey: resource.key,
          action,
          role: UserRole.USER,
          departmentId: null,
          allowed,
        });
      }
    }

    // ── USER: parking resources with departmentId=null (so they appear in matrix) ──
    const parkingResourceKeys = RESOURCE_DEFINITIONS
      .filter((r) => !departmentIndependentResources.includes(r.key))
      .map((r) => r.key);

    for (const resourceKey of parkingResourceKeys) {
      const resource = RESOURCE_DEFINITIONS.find((r) => r.key === resourceKey);
      if (!resource) continue;

      for (const action of resource.actions) {
        permissionsToCreate.push({
          resourceKey: resource.key,
          action,
          role: UserRole.USER,
          departmentId: null,
          allowed: true,
        });
      }
    }

    // ── USER: department-specific parking resources (overrides per department) ──
    const departments = await this.departmentRepo.find();
    const deptByName = new Map(departments.map((d) => [d.name, d]));

    // Define which departments grant access to which resources
    const userDeptResources: Record<string, string[]> = {
      'parking.issues': ['Dispecerat', 'Intretinere Parcari'],
      'parking.damages': ['Dispecerat', 'Intretinere Parcari'],
      'parking.payment-machines': ['Dispecerat', 'Intretinere Parcari'],
      'parking.stats': ['Dispecerat', 'Intretinere Parcari'],
      'parking.handicap': ['Intretinere Parcari', 'Parcari Handicap', 'Parcari Domiciliu'],
      'parking.domiciliu': ['Intretinere Parcari', 'Parcari Handicap', 'Parcari Domiciliu'],
      'pv-facturare': ['Procese Verbale/Facturare', 'Control'],
      'parcometre': ['Parcometre'],
      'achizitii': ['Achizitii'],
      'incasari-cheltuieli': ['Achizitii'],
      'control-sesizari': ['Control', 'Intretinere Parcari'],
    };

    for (const [resourceKey, allowedDeptNames] of Object.entries(userDeptResources)) {
      const resource = RESOURCE_DEFINITIONS.find((r) => r.key === resourceKey);
      if (!resource) continue;

      for (const deptName of allowedDeptNames) {
        const dept = deptByName.get(deptName);
        if (!dept) {
          this.logger.warn(`Department "${deptName}" not found during seed, skipping`);
          continue;
        }

        for (const action of resource.actions) {
          permissionsToCreate.push({
            resourceKey: resource.key,
            action,
            role: UserRole.USER,
            departmentId: dept.id,
            allowed: true,
          });
        }
      }
    }

    // Save all permissions in bulk
    const entities = permissionsToCreate.map((p) => this.permissionRepo.create(p));
    await this.permissionRepo.save(entities, { chunk: 100 });

    this.logger.log(`Seeded ${entities.length} permissions`);
  }

  private async seedTaskFlows() {
    // Clear existing task flow rules
    await this.taskFlowRepo.clear();

    const departments = await this.departmentRepo.find();
    const deptByName = new Map(departments.map((d) => [d.name, d]));

    const getDeptId = (name: string): string | null => {
      const dept = deptByName.get(name);
      if (!dept) {
        this.logger.warn(`Department "${name}" not found for task flow seed, using null`);
        return null;
      }
      return dept.id;
    };

    const taskFlows: Partial<TaskFlowRule>[] = [
      {
        taskType: 'parking_issue',
        creatorRole: UserRole.USER,
        creatorDepartmentId: getDeptId('Dispecerat') || getDeptId('Control'),
        receiverRole: UserRole.USER,
        receiverDepartmentId: getDeptId('Intretinere Parcari'),
        resolverRole: UserRole.USER,
        resolverDepartmentId: getDeptId('Intretinere Parcari'),
        autoAssign: true,
      },
      {
        taskType: 'parking_damage',
        creatorRole: UserRole.USER,
        creatorDepartmentId: getDeptId('Dispecerat') || getDeptId('Control'),
        receiverRole: UserRole.ADMIN,
        receiverDepartmentId: null,
        resolverRole: UserRole.ADMIN,
        resolverDepartmentId: null,
        autoAssign: false,
      },
      {
        taskType: 'handicap_request',
        creatorRole: UserRole.USER,
        creatorDepartmentId: getDeptId('Parcari Handicap'),
        receiverRole: UserRole.USER,
        receiverDepartmentId: getDeptId('Intretinere Parcari'),
        resolverRole: UserRole.USER,
        resolverDepartmentId: getDeptId('Intretinere Parcari'),
        autoAssign: true,
      },
      {
        taskType: 'domiciliu_request',
        creatorRole: UserRole.USER,
        creatorDepartmentId: getDeptId('Parcari Domiciliu'),
        receiverRole: UserRole.USER,
        receiverDepartmentId: getDeptId('Intretinere Parcari'),
        resolverRole: UserRole.USER,
        resolverDepartmentId: getDeptId('Intretinere Parcari'),
        autoAssign: true,
      },
      {
        taskType: 'leave_request',
        creatorRole: UserRole.USER,
        creatorDepartmentId: null,
        receiverRole: UserRole.ADMIN,
        receiverDepartmentId: null,
        resolverRole: UserRole.ADMIN,
        resolverDepartmentId: null,
        autoAssign: false,
      },
      {
        taskType: 'shift_swap',
        creatorRole: UserRole.USER,
        creatorDepartmentId: null,
        receiverRole: UserRole.USER,
        receiverDepartmentId: null,
        resolverRole: UserRole.ADMIN,
        resolverDepartmentId: null,
        autoAssign: false,
      },
      {
        taskType: 'control_sesizare',
        creatorRole: UserRole.USER,
        creatorDepartmentId: getDeptId('Control'),
        receiverRole: UserRole.USER,
        receiverDepartmentId: getDeptId('Intretinere Parcari'),
        resolverRole: UserRole.USER,
        resolverDepartmentId: getDeptId('Intretinere Parcari'),
        autoAssign: true,
      },
    ];

    const entities = taskFlows.map((tf) => this.taskFlowRepo.create(tf));
    await this.taskFlowRepo.save(entities);

    this.logger.log(`Seeded ${entities.length} task flow rules`);
  }
}
