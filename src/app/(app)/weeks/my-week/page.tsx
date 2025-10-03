
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
    const isPrivileged = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

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

    const { weeksToShow, isRedirecting, canManage } = useMemo(() => {
        let shouldRedirect = false;
        
        if (loading || !user) {
            return { weeksToShow: [], isRedirecting: false, canManage: false };
        }

        // Determine who can manage weeks (edit/delete/clone)
        const canManageWeeks = activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Encargado';
        
        let visibleWeeks: Week[] = [];

        // Master, Admin, and Oficial see all weeks
        if (isPrivileged || activeRole === 'Oficial') {
            visibleWeeks = [...allWeeks];
        } else {
            // Other roles (Bombero, Encargado) see only their assigned weeks
            visibleWeeks = allWeeks.filter(week => 
                week.allMembers?.some(member => member.legajo === user.id)
            );
        }

        // Sort all visible weeks by date
        const sortedWeeks = visibleWeeks.sort((a,b) => parseISO(b.periodStartDate).getTime() - parseISO(a.periodStartDate).getTime());
        
        // Auto-redirect logic for non-privileged users to their active week
        if (!isPrivileged && activeRole !== 'Oficial') {
            const today = new Date();
            // Find active week only from the weeks they are assigned to
            const assignedWeeks = allWeeks.filter(week => 
                week.allMembers?.some(member => member.legajo === user.id)
            );
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
        
        return {
            weeksToShow: sortedWeeks, 
            isRedirecting: shouldRedirect,
            canManage: canManageWeeks,
        };

    }, [allWeeks, user, activeRole, loading, router, isPrivileged]);


    if (loading || isRedirecting) {
        return (
             <>
                <PageHeader title={isPrivileged ? "Gestión de Semanas" : "Mis Semanas"} description="Gestiona y visualiza las semanas de guardia." />
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
                title={isPrivileged ? "Gestión de Semanas" : "Mis Semanas"}
                description={isPrivileged ? "Cree, edite o clone semanas de guardia." : "Aquí puedes ver todas tus semanas asignadas y gestionar las que te correspondan."}
            >
                {(activeRole === 'Master' || activeRole === 'Administrador') && (
                    <AddWeekDialog onWeekAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Semana
                        </Button>
                    </AddWeekDialog>
                )}
            </PageHeader>
            
            <WeekList weeks={weeksToShow} isLoading={loading} onDataChange={handleDataChange} canManage={canManage} />
        </>
    );
}
