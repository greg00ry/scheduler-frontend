import client from './client';
import type { CreateAvailabilityDTO } from '../types';

export const createAvailability = (data: CreateAvailabilityDTO) =>
  client.post<CreateAvailabilityDTO>('/api/availability', data).then(r => r.data);

export const deleteAvailability = (id: number) => client.delete(`/api/availability/${id}`);
