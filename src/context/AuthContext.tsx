import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { Role, UserDetailsDTO } from '../types';
import client from '../api/client';

interface JwtPayload {
  sub: string;
  role?: Role;
  id?: number;
  exp: number;
}

interface AuthUser {
  id: number | null;
  email: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === 'true';
const DEV_USER: AuthUser = { id: null, email: 'dev@local', role: 'ADMIN' };

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchRoleFromBackend(id: number): Promise<Role | null> {
  try {
    const res = await client.get<UserDetailsDTO>('/api/user/details', { params: { id } });
    return res.data.role;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => SKIP_AUTH ? null : localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(SKIP_AUTH ? DEV_USER : null);

  useEffect(() => {
    if (SKIP_AUTH) return;
    if (!token) { setUser(null); return; }
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const email = decoded.sub;
      const id = decoded.id ?? null;
      if (decoded.role) {
        setUser({ id, email, role: decoded.role });
      } else {
        setUser({ id, email, role: 'EMPLOYEE' });
        if (id) fetchRoleFromBackend(id).then(role => {
          if (role) setUser({ id, email, role });
        });
      }
    } catch {
      setToken(null);
    }
  }, [token]);

  const login = (t: string) => {
    localStorage.setItem('token', t);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
