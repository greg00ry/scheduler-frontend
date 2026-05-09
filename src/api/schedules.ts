import client from './client';
import type { ScheduleDTO, ShiftDTO, CreateScheduleDTO } from '../types';

export const getAllSchedules = () => client.get<ScheduleDTO[]>('/api/schedule/all').then(r => r.data);
export const getSchedule = (id: number) => client.get<ScheduleDTO>(`/api/schedule/${id}`).then(r => r.data);
export const getShiftsBySchedule = (id: number) => client.get<ShiftDTO[]>(`/api/schedule/${id}/shifts`).then(r => r.data);
export const getAllShifts = () => client.get<ShiftDTO[]>('/api/schedule/shift/all').then(r => r.data);
export const getShift = (id: number) => client.get<ShiftDTO>(`/api/schedule/shift/${id}`).then(r => r.data);
export const createSchedule = (data: CreateScheduleDTO) => client.post<ScheduleDTO>('/api/schedule/create', data).then(r => r.data);
