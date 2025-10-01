
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { getWeeks } from '@/services/weeks.service';
import { Week } from '@/lib/types';
import { isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function MyWeekRedirectPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) {
            return; // Wait for authentication to resolve
        }

        if (!user) {
            router.push('/'); // Should be handled by layout, but as a safeguard
            return;
        }

        const findAndRedirect = async () => {
            try {
                const allWeeks = await getWeeks();
                const today = new Date();
                
                const myActiveWeek = allWeeks.find(week => {
                    const isMember = week.allMembers?.some(member => member.legajo === user.id);
                    if (!isMember) return false;

                    const startDate = startOfDay(parseISO(week.periodStartDate));
                    const endDate = endOfDay(parseISO(week.periodEndDate));
                    return isWithinInterval(today, { start: startDate, end: endDate });
                });

                if (myActiveWeek) {
                    router.replace(`/weeks/${myActiveWeek.id}`);
                } else {
                    // If no active week is found, stop loading and show a message
                    setError("No estás asignado/a a ninguna semana activa en este momento.");
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed to find active week:", err);
                setError("Ocurrió un error al buscar tu semana activa. Por favor, intenta de nuevo.");
                setLoading(false);
            }
        };

        findAndRedirect();

    }, [user, authLoading, router]);

    if (loading) {
        return (
            <>
                <PageHeader title="Buscando tu semana..." description="Redirigiendo a los detalles de tu semana activa." />
                <Skeleton className="w-full h-64" />
            </>
        );
    }
    
    if (error) {
         return (
            <>
                <PageHeader title="Mi Semana" />
                <Alert variant="default" className="max-w-xl mx-auto">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No Encontrada</AlertTitle>
                    <AlertDescription>
                        {error}
                    </AlertDescription>
                </Alert>
            </>
        );
    }

    // This content will likely not be seen as the user is redirected,
    // but it's good practice to have a fallback.
    return (
        <PageHeader title="Redirigiendo..." />
    );
}

