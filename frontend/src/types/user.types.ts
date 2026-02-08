export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface Department {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  departmentId: string | null;
  department?: Department | null;
  avatarUrl: string | null;
  isActive: boolean;
  birthDate: string | null;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}
