export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface Permission {
  id: string;
  resourceKey: string;
  action: string;
  role: UserRole;
  departmentId: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  allowed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermissionOverride {
  id: string;
  userId: string;
  resourceKey: string;
  action: string;
  allowed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFlowRule {
  id: string;
  taskType: string;
  creatorRole: UserRole | null;
  creatorDepartmentId: string | null;
  creatorDepartment?: { id: string; name: string } | null;
  receiverRole: UserRole | null;
  receiverDepartmentId: string | null;
  receiverDepartment?: { id: string; name: string } | null;
  resolverRole: UserRole | null;
  resolverDepartmentId: string | null;
  resolverDepartment?: { id: string; name: string } | null;
  autoAssign: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Matrix shape: resourceKey -> action -> role -> departmentKey -> { id, allowed }
export type PermissionMatrix = Record<
  string,
  Record<string, Record<string, Record<string, { id: string; allowed: boolean }>>>
>;

export interface EffectivePermissions {
  userId: string;
  role: UserRole;
  departmentId: string | null;
  permissions: Record<string, boolean>;
}

export interface PermissionSummary {
  [role: string]: {
    total: number;
    allowed: number;
    denied: number;
  };
}

export interface BulkUpdateItem {
  id: string;
  allowed: boolean;
}

export interface OverrideItem {
  resourceKey: string;
  action: string;
  allowed: boolean;
}

export interface CreateTaskFlowRequest {
  taskType: string;
  creatorRole?: UserRole | null;
  creatorDepartmentId?: string | null;
  receiverRole?: UserRole | null;
  receiverDepartmentId?: string | null;
  resolverRole?: UserRole | null;
  resolverDepartmentId?: string | null;
  autoAssign?: boolean;
  isActive?: boolean;
}
