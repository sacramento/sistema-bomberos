
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

    const fetchAllWeeks = async () => {
        if (!user) {
            setLoading(false);
            return;
        };

        setLoading(true);
        try {
            const allWeeksData = await getWeeks();
            setAllWeeks(allWeeksData);
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudieron cargar los datos de la semana.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchAllWeeks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleDataChange = () => {
        fetchAllWeeks();
    };

    const { weeksToShow, isRedirecting } = useMemo(() => {
        let shouldRedirect = false;
        
        if (loading || !user) {
            return { weeksToShow: [], isRedirecting: false };
        }
        
        // For non-managing roles, check for an active week to redirect to.
        if (!canManage && activeRole !== 'Oficial') {
            const assignedWeeks = allWeeks.filter(week => 
                week.allMembers?.some(member => member.legajo === user.id)
            );
            const today = new Date();
            const activeWeek = assignedWeeks.find(week => {
                const startDate = startOfDay(parseISO(week.periodStartDate));
                const endDate = endOfDay(parseISO(week.periodEndDate));
                return isWithinInterval(today, { start: startDate, end: endDate });
            });
            if (activeWeek) {
                shouldRedirect = true;
                router.replace(`/weeks/${activeWeek.id}`);
            }
        }
        
        let finalWeeksToShow: Week[] = [];
        if (canManage || activeRole === 'Oficial') {
            finalWeeksToShow = allWeeks; 
        } else if (user) {
            finalWeeksToShow = allWeeks.filter(week => 
                week.allMembers?.some(member => member.legajo === user.id)
            );
        }

        return {
            weeksToShow: finalWeeksToShow.sort((a,b) => parseISO(b.periodStartDate).getTime() - parseISO(a.periodStartDate).getTime()), 
            isRedirecting: shouldRedirect
        };

    }, [allWeeks, user, canManage, activeRole, loading, router]);


    if (loading || isRedirecting) {
        return (
             <>
                <PageHeader title="Mis Semanas" description="Gestiona y visualiza tus semanas de guardia asignadas." />
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
                title={canManage || activeRole === 'Oficial' ? "Gestión de Semanas" : "Mis Semanas"} 
                description={canManage || activeRole === 'Oficial' ? "Cree, clone o gestione todas las semanas desde esta vista." : "No tienes una semana activa. Aquí puedes ver todas tus semanas asignadas, pasadas y futuras."}
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
            
            <WeekList weeks={weeksToShow} isLoading={loading} onDataChange={handleDataChange} canManage={canManage} showDetailsButton={true} />
        </>
    );
}
