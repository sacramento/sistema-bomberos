
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import AddWeekDialog from "../_components/add-week-dialog";
import WeekList from "../_components/week-list";
import { Week, Firefighter } from "@/lib/types";
import { getWeeks } from "@/services/weeks.service";
import { getFirefighters } from "@/services/firefighters.service";
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
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);

    const activeRole = getActiveRole(pathname);
    const isPrivileged = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

    const fetchAllData = async () => {
        if (!user) {
            setLoading(false);
            return;
        };

        setLoading(true);
        try {
            const [weeksData, firefightersData] = await Promise.all([
                getWeeks(),
                getFirefighters()
            ]);
            setAllWeeks(weeksData);
            setAllFirefighters(firefightersData);
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
        fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleDataChange = () => {
        fetchAllData();
    };

    const { weeksToShow, isRedirecting, canManage, loggedInFirefighter } = useMemo(() => {
        if (loading || !user) {
            return { weeksToShow: [], isRedirecting: false, canManage: false, loggedInFirefighter: null };
        }

        const firefighterData = allFirefighters.find(f => f.legajo === user.id);
        const canManageWeeks = activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Encargado';
        
        let visibleWeeks: Week[] = [];

        if (isPrivileged || activeRole === 'Oficial') {
            visibleWeeks = [...allWeeks];
        } else if (activeRole === 'Encargado' && firefighterData) {
            // Encargado sees all weeks from their firehouse
            visibleWeeks = allWeeks.filter(week => week.firehouse === firefighterData.firehouse);
        } else {
            // Bombero role sees only weeks they are a member of
            visibleWeeks = allWeeks.filter(week => 
                week.allMembers?.some(member => member.legajo === user.id)
            );
        }

        const sortedWeeks = visibleWeeks.sort((a,b) => parseISO(b.periodStartDate).getTime() - parseISO(a.periodStartDate).getTime());
        
        let shouldRedirect = false;
        if (!isPrivileged && activeRole !== 'Oficial' && activeRole !== 'Encargado') {
            const today = new Date();
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
            loggedInFirefighter: firefighterData || null
        };

    }, [allWeeks, allFirefighters, user, activeRole, loading, router, isPrivileged]);


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
            
            <WeekList 
                weeks={weeksToShow} 
                isLoading={loading} 
                onDataChange={handleDataChange} 
                canManageGenerally={canManage} 
                loggedInFirefighter={loggedInFirefighter}
            />
        </>
    );
}
