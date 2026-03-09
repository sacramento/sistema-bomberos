'use client';

import { login as loginFlow } from '@/ai/auth-flow';
import type { LoginInput } from '@/lib/schemas/auth.schema';
import { LoggedInUser, GlobalRole, AttendanceModuleRole, WeekModuleRole, MobilityModuleRole, MaterialesModuleRole, AyudantiaModuleRole, RoperiaModuleRole, ServiciosModuleRole, CascadaModuleRole, AspirantesModuleRole } from '@/lib/types';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { initializeFirebase } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';

const SESSION_STORAGE_KEY = 'fuego-registro-session';

export type ActiveRole = GlobalRole | AttendanceModuleRole | WeekModuleRole | MobilityModuleRole | MaterialesModuleRole | AyudantiaModuleRole | RoperiaModuleRole | ServiciosModuleRole | CascadaModuleRole | AspirantesModuleRole | 'Ninguno';

interface AuthContextType {
  user: LoggedInUser;
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  getActiveRole: (pathname: string) => ActiveRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const pathToModule: Record<string, 'asistencia' | 'semanas' | 'movilidad' | 'materiales' | 'general' | 'ayudantia' | 'roperia' | 'servicios' | 'cascada' | 'aspirantes' | 'dashboard'> = {
    '/sessions': 'asistencia',
    '/classes': 'asistencia',
    '/schedule': 'asistencia',
    '/firefighters': 'asistencia',
    '/courses': 'asistencia',
    '/reports': 'asistencia',
    '/talleres': 'asistencia',
    '/aspirantes/clases': 'aspirantes',
    '/aspirantes/talleres': 'aspirantes',
    '/aspirantes/cursos': 'aspirantes',
    '/aspirantes-reports': 'aspirantes',
    '/aspirantes': 'aspirantes',
    '/weeks': 'semanas',
    '/vehicles': 'movilidad',
    '/drivers': 'movilidad',
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
    '/services-reports': 'servicios',
    '/services': 'servicios',
    '/cascade': 'cascada',
    '/cascade-reports': 'cascada',
    '/admin': 'general',
    '/dashboard': 'dashboard'
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoggedInUser>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Sincronizar con Firebase Auth para que las reglas de seguridad funcionen
  const syncWithFirebaseAuth = async () => {
    try {
      const { auth } = initializeFirebase();
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    } catch (e) {
      console.error("Error syncing with Firebase Auth:", e);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (storedSession) {
          const parsedUser = JSON.parse(storedSession);
          const userWithCompleteRoles = {
            ...parsedUser,
            roles: {
              asistencia: parsedUser.roles?.asistencia || 'Ninguno',
              semanas: parsedUser.roles?.semanas || 'Ninguno',
              movilidad: parsedUser.roles?.movilidad || 'Ninguno',
              materiales: parsedUser.roles?.materiales || 'Ninguno',
              ayudantia: parsedUser.roles?.ayudantia || 'Ninguno',
              roperia: parsedUser.roles?.roperia || 'Ninguno',
              servicios: parsedUser.roles?.servicios || 'Ninguno',
              cascada: parsedUser.roles?.cascada || 'Ninguno',
              aspirantes: parsedUser.roles?.aspirantes || 'Ninguno',
            }
          };
          setUser(userWithCompleteRoles);
          await syncWithFirebaseAuth();
        }
      } catch (e) {
        console.error('Error parsing stored session', e);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const handleLogin = async (credentials: LoginInput) => {
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await loginFlow(credentials);
      if (loggedInUser) {
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
            cascada: loggedInUser.roles?.cascada || 'Ninguno',
            aspirantes: loggedInUser.roles?.aspirantes || 'Ninguno',
          }
        };
        
        await syncWithFirebaseAuth();
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

      const roles = user.roles || { asistencia: 'Ninguno', semanas: 'Ninguno', movilidad: 'Ninguno', materiales: 'Ninguno', ayudantia: 'Ninguno', roperia: 'Ninguno', servicios: 'Ninguno', cascada: 'Ninguno', aspirantes: 'Ninguno' };
      
      const moduleKey = Object.keys(pathToModule).find(key => currentPath.startsWith(key));
      const module = moduleKey ? pathToModule[moduleKey] : null;
      
      switch(module) {
        case 'semanas': return roles.semanas;
        case 'asistencia': return roles.asistencia;
        case 'movilidad': return roles.movilidad;
        case 'materiales': return roles.materiales;
        case 'ayudantia': return roles.ayudantia;
        case 'roperia': return roles.roperia;
        case 'servicios': return roles.servicios;
        case 'cascada': return roles.cascada;
        case 'aspirantes': return roles.aspirantes;
        default: return user.role;
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
