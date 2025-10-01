
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import AddWeekDialog from "../_components/add-week-dialog";
import WeekList from "../_components/week-list";
import { Week } from "@/lib/types";
import { getWeeks } from "@/services/weeks.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

export default function MyWeekPage() {
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const [allWeeks, setAllWeeks] = useState<Week[]>([]);
    const [loading, setLoading] = useState(true);

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const weeksData = await getWeeks();
                const userWeeks = weeksData.filter(week => 
                    week.allMembers?.some(member => member.legajo === user.id)
                );
                
                const today = new Date();
                const activeWeek = userWeeks.find(week => {
                    const startDate = startOfDay(parseISO(week.periodStartDate));
                    const endDate = endOfDay(parseISO(week.periodEndDate));
                    return isWithinInterval(today, { start: startDate, end: endDate });
                });

                // If user has an active week, redirect them directly to it.
                if (activeWeek) {
                    router.replace(`/weeks/${activeWeek.id}`);
                    // We don't setLoading(false) here because the redirect will unmount this component.
                } else {
                    setAllWeeks(userWeeks);
                    setLoading(false);
                }

            } catch (error) {
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los datos de la semana.",
                    variant: "destructive"
                });
                setLoading(false);
            }
        };

        fetchAllData();
    }, [user, router, toast]);

    const handleDataChange = () => {
        // Re-trigger the fetch logic
         const fetchAllData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const weeksData = await getWeeks();
                const userWeeks = weeksData.filter(week => 
                    week.allMembers?.some(member => member.legajo === user.id)
                );
                setAllWeeks(userWeeks);
            } catch (error) {
                 toast({
                    title: "Error",
                    description: "No se pudieron recargar los datos.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    };

    if (loading) {
        return (
             <>
                <PageHeader title="Mis Semanas" description="Gestiona y visualiza tus semanas de guardia asignadas.">
                    {canManage && <Skeleton className="h-10 w-36" />}
                </PageHeader>
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </>
        )
    }
    
    return (
        <>
            <PageHeader 
                title="Mis Semanas" 
                description="Actualmente no tienes una semana activa. Aquí puedes ver todas tus semanas asignadas."
            >
                {canManage && (
                    <AddWeekDialog onWeekAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Semana
                        </Button>
                    </AddWeekDialog>
                )}
            </PageHeader>
            
            <WeekList weeks={allWeeks} isLoading={loading} onDataChange={handleDataChange} canManage={canManage} />
        </>
    );
}
