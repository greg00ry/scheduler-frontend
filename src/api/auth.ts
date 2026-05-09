import client from './client';
import type { LoginDTO } from '../types';

export const login = async (data: LoginDTO): Promise<string> => {
  const res = await client.post<string>('/api/auth/login', data);
  return res.data;
};
