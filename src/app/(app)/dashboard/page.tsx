
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PortalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user) {
        const isWeeksUser = user.roles.semanas !== 'Ninguno';
        const isAsistenciaUser = user.roles.asistencia !== 'Ninguno';

        // If the user's primary or only role is for the 'Semanas' module, redirect them there.
        if (isWeeksUser && !isAsistenciaUser) {
          router.replace('/weeks/my-week');
        } else {
          // Otherwise, the default is the 'Asistencia' dashboard.
          router.replace('/sessions');
        }
    } else {
        // If for some reason there's no user, send back to login
        router.replace('/');
    }
  }, [user, loading, router]);

  // Show a loading state while redirecting
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4">
        <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
    </div>
  );
}
