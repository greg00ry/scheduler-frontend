import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { Role } from '../types';

interface JwtPayload {
  sub: string;
  role?: Role;
  exp: number;
}

interface AuthUser {
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
const DEV_USER: AuthUser = { email: 'dev@local', role: 'ADMIN' };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => SKIP_AUTH ? null : localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(SKIP_AUTH ? DEV_USER : null);

  useEffect(() => {
    if (SKIP_AUTH) return;
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        setUser({ email: decoded.sub, role: decoded.role ?? 'EMPLOYEE' });
      } catch {
        setToken(null);
      }
    } else {
      setUser(null);
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
