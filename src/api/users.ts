import client from './client';
import type { UserDTO, UserDetailsDTO, CreateUserDTO, UpdateUserDTO, Role } from '../types';

export const getAll = () => client.get<UserDTO[]>('/api/user/all').then(r => r.data);
export const getById = (id: number) => client.get<UserDTO>(`/api/user/${id}`).then(r => r.data);
export const getDetails = () => client.get<UserDetailsDTO>('/api/user/details').then(r => r.data);
export const getByRole = (role: Role) => client.get<UserDTO[]>('/api/user/by-role', { params: { role } }).then(r => r.data);
export const getAvailableByDate = (date: string) => client.get<UserDTO[]>('/api/user/available', { params: { date } }).then(r => r.data);
export const createUser = (data: CreateUserDTO) => client.post<UserDTO>('/api/user', data).then(r => r.data);
export const updateUser = (data: UpdateUserDTO) => client.put<UserDTO>('/api/user/update', data).then(r => r.data);
export const deleteUser = (id: number) => client.delete(`/api/user/${id}`);
