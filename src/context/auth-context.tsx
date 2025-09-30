
'use client';

import { login as loginFlow } from '@/ai/auth-flow';
import type { LoginInput } from '@/lib/schemas/auth.schema';
import { LoggedInUser, ModuleRole } from '@/lib/types';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const SESSION_STORAGE_KEY = 'fuego-registro-session';

interface AuthContextType {
  user: LoggedInUser;
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  getActiveRole: (pathname: string) => ModuleRole | 'Administrador' | 'Ninguno';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoggedInUser>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSession) {
        setUser(JSON.parse(storedSession));
      }
    } catch (e) {
      console.error('Error parsing stored session', e);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (credentials: LoginInput) => {
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await loginFlow(credentials);
      if (loggedInUser) {
        setUser(loggedInUser);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(loggedInUser));
        router.push('/dashboard');
      } else {
        throw new Error('Credenciales inválidas. Por favor, intente de nuevo.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    router.push('/');
  };

  const getActiveRole = (currentPath: string): ModuleRole | 'Administrador' | 'Ninguno' => {
      if (!user) return 'Ninguno';
      if (user.role === 'Administrador') return 'Administrador';

      if (currentPath.startsWith('/weeks')) {
          return user.roles.semanas;
      }
      
      // Asistencia es el módulo por defecto
      if (currentPath.startsWith('/sessions') || currentPath.startsWith('/schedule') || currentPath.startsWith('/firefighters') || currentPath.startsWith('/courses') || currentPath.startsWith('/classes') || currentPath.startsWith('/leaves') || currentPath.startsWith('/reports')) {
        return user.roles.asistencia;
      }
      
      return 'Bombero'; // Default role for portal or unknown paths
  };

  const value = {
    user,
    login: handleLogin,
    logout: handleLogout,
    loading: loading,
    error,
    getActiveRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
