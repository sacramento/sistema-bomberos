
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { navItems } from '../layout';

export default function PortalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    // This page acts as a router to the user's default dashboard.
    const roles = user.roles || { asistencia: 'Ninguno', semanas: 'Ninguno', movilidad: 'Ninguno' };

    let destination = '/schedule'; // A safe default for roles with limited access.

    // 1. Semanas module has top priority
    if (roles.semanas !== 'Ninguno') {
        destination = '/weeks/my-week';
    } 
    // 2. Asistencia module for higher-level roles
    else if (roles.asistencia === 'Master' || roles.asistencia === 'Administrador' || roles.asistencia === 'Oficial' || roles.asistencia === 'Instructor') {
        destination = '/sessions';
    }
    // 3. Fallback for Asistencia roles like Ayudantía, who can't see /sessions.
    // navItems are imported to check for the first available path.
    else if (roles.asistencia !== 'Ninguno') {
        const firstAllowedPath = navItems.find(item => item.module === 'asistencia' && item.roles.includes(roles.asistencia))?.href;
        destination = firstAllowedPath || '/schedule'; // Default to schedule if somehow no path is found
    }
    
    router.replace(destination);

  }, [user, loading, router]);

  // This page is a loading/redirecting fallback.
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4">
        <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <p className="text-center text-muted-foreground mt-4">Redirigiendo a su dashboard...</p>
        </div>
    </div>
  );
}
