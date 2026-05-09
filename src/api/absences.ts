import client from './client';
import type { AbsenceDTO, CreateAbsenceDTO } from '../types';

export const createAbsence = (data: CreateAbsenceDTO) =>
  client.post<AbsenceDTO>('/api/absence', data).then(r => r.data);

export const deleteAbsence = (id: number) => client.delete(`/api/absence/${id}`);
