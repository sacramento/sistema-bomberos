'use client';

import { login as loginFlow } from '@/ai/auth-flow';
import type { LoginInput } from '@/lib/schemas/auth.schema';
import { LoggedInUser } from '@/lib/types';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoggedInUser>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // On initial load, check sessionStorage for a stored session
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

  // Effect to handle redirection based on auth state
  useEffect(() => {
    if (loading) return;
    
    const isAuthRoute = pathname === '/login';

    // If user is logged in and tries to access login page, redirect to dashboard
    if (user && isAuthRoute) {
      router.push('/dashboard');
    }
    // If user is not logged in and not on login page, they should be redirected
    // This logic is now handled in the AppLayout to avoid provider conflicts.
    
  }, [user, loading, pathname, router]);

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
    router.push('/login');
  };

  const value = {
    user,
    login: handleLogin,
    logout: handleLogout,
    loading: loading,
    error,
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
