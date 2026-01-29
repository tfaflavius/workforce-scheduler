export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  urgency: TaskUrgency;
  status: TaskStatus;
  taskType: string | null;
  assignedTo: string | null;
  assignedBy: string | null;
  departmentId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  createdAt: string;
  updatedAt: string;
  assignedToUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  assignedByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  urgency?: TaskUrgency;
  taskType?: string;
  dueDate?: string;
  assignedTo?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  urgency?: TaskUrgency;
  status?: TaskStatus;
  taskType?: string;
  dueDate?: string;
  assignedTo?: string;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  changeType: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  createdAt: string;
  changedByUser?: {
    id: string;
    fullName: string;
    email: string;
  };
}
