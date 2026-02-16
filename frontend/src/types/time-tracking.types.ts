export interface TimeEntry {
  id: string;
  userId: string;
  taskId: string | null;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  isManualEntry: boolean;
  approvalStatus: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  task?: {
    id: string;
    title: string;
    taskType: string | null;
  };
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  locationLogs?: LocationLog[];
}

export interface LocationLog {
  id: string;
  timeEntryId: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: string;
  isAutoRecorded: boolean;
  createdAt: string;
}

export interface StartTimerRequest {
  taskId?: string;
}

export interface RecordLocationRequest {
  timeEntryId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  isAutoRecorded?: boolean;
}

export interface StopTimerResponse extends TimeEntry {
  scheduleMismatch: boolean;
  expectedMinutes: number;
  actualMinutes: number;
  expectedHours: number;
  actualHours: number;
}

export interface GetTimeEntriesFilters {
  startDate?: string;
  endDate?: string;
  taskId?: string;
}
