export type Role = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';

export interface UserDTO {
  id: number;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface UserDetailsDTO {
  id: number;
  firstName: string;
  lastName: string;
  role: Role;
  absences: AbsenceDTO[];
  workingHoursList: WorkingHoursDTO[];
}

export interface WorkingHoursDTO {
  id: number;
  totalHours: number;
  overtimeHours: number;
}

export interface CreateUserDTO {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserDTO {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  role?: Role;
}

export interface ScheduleDTO {
  id: number;
  weekStart: string;
  weekEnd: string;
  createdBy_id: UserDTO;
}

export interface ShiftDTO {
  id: number;
  userDTO: UserDTO;
  date: string;
  startTime: string;
  endTime: string;
}

export interface CreateShiftDTO {
  userId: number;
  scheduleId?: number;
  date: string;
  startTime: string;
  endTime: string;
  status?: string;
  validationMessage?: string;
  valid?: boolean;
}

export interface CreateScheduleDTO {
  weekStart: string;
  weekEnd: string;
  createdBy_id: number;
  shifts: CreateShiftDTO[];
}

export interface CreateAvailabilityDTO {
  userId: number;
  date: string;
  available: boolean;
}

export interface AbsenceDTO {
  id: number;
  shift: ShiftDTO;
  reason: string;
  reportedAt: string;
}

export interface CreateAbsenceDTO {
  userId: number;
  shiftId: number;
  reason: string;
  reportedAt: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}
