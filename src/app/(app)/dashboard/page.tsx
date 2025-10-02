
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { getWeeks } from '@/services/weeks.service';
import { useToast } from '@/hooks/use-toast';
import { isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

export default function PortalPage() {
  const { user, loading, getActiveRole } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    const activeRoleForWeeks = user.roles?.semanas;
    const activeRoleForAttendance = user.roles?.asistencia;
    
    // Default path for Asistencia module users
    let destination = '/sessions';

    // If user has any role in the Semanas module, that takes priority
    if (activeRoleForWeeks && activeRoleForWeeks !== 'Ninguno') {
        destination = '/weeks/my-week';
        
        // For non-supervisor roles in Semanas, try to redirect to their active week
        if (activeRoleForWeeks === 'Encargado' || activeRoleForWeeks === 'Bombero') {
            getWeeks().then(allWeeksData => {
                const today = new Date();
                const activeWeek = allWeeksData.find(week => 
                    week.allMembers?.some(member => member.legajo === user.id) &&
                    isWithinInterval(today, { start: startOfDay(parseISO(week.periodStartDate)), end: endOfDay(parseISO(week.periodEndDate)) })
                );

                if (activeWeek) {
                    router.replace(`/weeks/${activeWeek.id}`);
                } else {
                    router.replace(destination);
                }
            }).catch(() => {
                toast({
                    title: "Error",
                    description: "No se pudo verificar la semana activa, redirigiendo al dashboard principal de semanas.",
                    variant: "destructive"
                });
                router.replace(destination);
            });
            return; // Exit useEffect to let async operation handle navigation
        }
    }
    
    router.replace(destination);

  }, [user, loading, router, getActiveRole, toast]);

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
