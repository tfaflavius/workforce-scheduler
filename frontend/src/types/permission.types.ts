export type UserRole = 'MASTER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER';

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

export interface EmailNotificationRule {
  id: string;
  eventType: string;
  eventAction: string;
  recipientType: 'ROLE' | 'DEPARTMENT' | 'CREATOR' | 'ASSIGNED' | 'ADMIN_ALL' | 'MANAGER_ALL';
  recipientRole: string | null;
  recipientDepartmentId: string | null;
  recipientDepartment?: { id: string; name: string } | null;
  description: string;
  sendImmediate: boolean;
  cronSchedule: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailRuleRequest {
  eventType: string;
  eventAction: string;
  recipientType: string;
  recipientRole?: string | null;
  recipientDepartmentId?: string | null;
  description: string;
  sendImmediate?: boolean;
  cronSchedule?: string | null;
  isActive?: boolean;
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

// ─── Notification Settings ───────────────────────────────

export interface NotificationSetting {
  id: string;
  notificationType: string;
  role: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettingBulkUpdateItem {
  id: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
}
