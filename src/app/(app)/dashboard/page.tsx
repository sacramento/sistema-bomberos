
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

export default function PortalPage() {
  const { user, loading, getActiveRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    const activeRoleForWeeks = user.roles.semanas;
    const activeRoleForAttendance = user.roles.asistencia;

    // Priority to "semanas" module for redirection if the user has a role there
    if (activeRoleForWeeks && activeRoleForWeeks !== 'Ninguno') {
        router.replace('/weeks/my-week');
    } else if (activeRoleForAttendance && activeRoleForAttendance !== 'Ninguno') {
        router.replace('/sessions');
    } else {
        // Fallback for users with no specific module role (like some Master users)
        router.replace('/sessions');
    }

  }, [user, loading, router, getActiveRole, pathname]);

  // This page is now a loading/redirecting fallback.
  // It prevents users from ever seeing a "unified platform" page.
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
