
'use client';

import { login as loginFlow } from '@/ai/auth-flow';
import type { LoginInput } from '@/lib/schemas/auth.schema';
import { LoggedInUser, GlobalRole, AttendanceModuleRole, WeekModuleRole, MobilityModuleRole, MaterialesModuleRole, AyudantiaModuleRole, RoperiaModuleRole, ServiciosModuleRole } from '@/lib/types';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const SESSION_STORAGE_KEY = 'fuego-registro-session';

export type ActiveRole = GlobalRole | AttendanceModuleRole | WeekModuleRole | MobilityModuleRole | MaterialesModuleRole | AyudantiaModuleRole | RoperiaModuleRole | ServiciosModuleRole | 'Ninguno';

interface AuthContextType {
  user: LoggedInUser;
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  getActiveRole: (pathname: string) => ActiveRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const pathToModule: Record<string, 'asistencia' | 'semanas' | 'movilidad' | 'materiales' | 'ayudantia' | 'roperia' | 'servicios' | 'general' | 'dashboard'> = {
    '/sessions': 'asistencia',
    '/classes': 'asistencia',
    '/schedule': 'asistencia',
    '/firefighters': 'asistencia',
    '/courses': 'asistencia',
    '/reports': 'asistencia',
    '/weeks': 'semanas',
    '/vehicles': 'movilidad',
    '/maintenance': 'movilidad',
    '/mobility-reports': 'movilidad',
    '/materials-reports': 'materiales',
    '/materials': 'materiales',
    '/leaves': 'ayudantia',
    '/sanctions': 'ayudantia',
    '/inventory': 'ayudantia',
    '/ayudantia-reports': 'ayudantia',
    '/clothing': 'roperia',
    '/clothing-reports': 'roperia',
    '/services': 'servicios',
    '/admin': 'general',
    '/dashboard': 'dashboard'
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoggedInUser>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSession) {
        const parsedUser = JSON.parse(storedSession);
        if (!parsedUser.roles) {
            parsedUser.roles = { asistencia: 'Ninguno', semanas: 'Ninguno', movilidad: 'Ninguno', materiales: 'Ninguno', ayudantia: 'Ninguno', roperia: 'Ninguno', servicios: 'Ninguno' };
        }
        setUser(parsedUser);
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
        // Ensure roles structure is complete
        const userWithCompleteRoles = {
          ...loggedInUser,
          roles: {
            asistencia: loggedInUser.roles?.asistencia || 'Ninguno',
            semanas: loggedInUser.roles?.semanas || 'Ninguno',
            movilidad: loggedInUser.roles?.movilidad || 'Ninguno',
            materiales: loggedInUser.roles?.materiales || 'Ninguno',
            ayudantia: loggedInUser.roles?.ayudantia || 'Ninguno',
            roperia: loggedInUser.roles?.roperia || 'Ninguno',
            servicios: loggedInUser.roles?.servicios || 'Ninguno',
          }
        };
        setUser(userWithCompleteRoles);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userWithCompleteRoles));
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

  const getActiveRole = (currentPath: string): ActiveRole => {
      if (!user) return 'Ninguno';
      if (user.role === 'Master') return 'Master';

      const roles = user.roles || { asistencia: 'Ninguno', semanas: 'Ninguno', movilidad: 'Ninguno', materiales: 'Ninguno', ayudantia: 'Ninguno', roperia: 'Ninguno', servicios: 'Ninguno' };
      
      const moduleKey = Object.keys(pathToModule).find(key => currentPath.startsWith(key));
      const module = moduleKey ? pathToModule[moduleKey] : null;
      
      switch(module) {
        case 'semanas':
          return roles.semanas;
        case 'asistencia':
          return roles.asistencia;
        case 'movilidad':
            return roles.movilidad;
        case 'materiales':
            return roles.materiales;
        case 'ayudantia':
            return roles.ayudantia;
        case 'roperia':
            return roles.roperia;
        case 'servicios':
            return roles.servicios;
        case 'general':
        case 'dashboard':
          return user.role;
        default:
          return user.role;
      }
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
