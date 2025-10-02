
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
    const isSupervisor = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Oficial', [activeRole]);

    useEffect(() => {
        const fetchAllWeeks = async () => {
            if (!user) {
                setLoading(false);
                return;
            };

            setLoading(true);
            try {
                const allWeeksData = await getWeeks();
                setAllWeeks(allWeeksData);

                // This redirection logic only applies to non-supervisors.
                if (!isSupervisor) {
                     const assignedWeeks = allWeeksData.filter(week => 
                        week.allMembers?.some(member => member.legajo === user.id)
                    );
                    const today = new Date();
                    const activeWeek = assignedWeeks.find(week => {
                        const startDate = startOfDay(parseISO(week.periodStartDate));
                        const endDate = endOfDay(parseISO(week.periodEndDate));
                        return isWithinInterval(today, { start: startDate, end: endDate });
                    });

                    if (activeWeek) {
                        router.replace(`/weeks/${activeWeek.id}`);
                        return; // A redirect is happening, so we don't need to finish loading on this page.
                    }
                }
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
        
        fetchAllWeeks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isSupervisor]);

    const handleDataChange = () => {
        setLoading(true);
        getWeeks().then(data => {
            setAllWeeks(data);
            setLoading(false);
        }).catch(() => {
             toast({
                title: "Error",
                description: "No se pudieron recargar los datos de la semana.",
                variant: "destructive"
            });
            setLoading(false);
        });
    };

    const weeksToShow = useMemo(() => {
        if (isSupervisor) {
            return allWeeks; 
        }
        if (user) {
            return allWeeks.filter(week => 
                week.allMembers?.some(member => member.legajo === user.id)
            );
        }
        return [];
    }, [allWeeks, user, isSupervisor]);

    // This check prevents flashing the page content before a potential redirect for non-supervisors.
    const isRedirecting = !isSupervisor && !loading && weeksToShow.some(week => {
        const today = new Date();
        const startDate = startOfDay(parseISO(week.periodStartDate));
        const endDate = endOfDay(parseISO(week.periodEndDate));
        return isWithinInterval(today, { start: startDate, end: endDate });
    });

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
                title={isSupervisor ? "Gestión de Semanas" : "Mis Semanas"} 
                description={isSupervisor ? "Cree, clone o gestione todas las semanas desde esta vista." : "Actualmente no tienes una semana activa. Aquí puedes ver todas tus semanas asignadas."}
            >
                {isSupervisor && (
                    <AddWeekDialog onWeekAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Semana
                        </Button>
                    </AddWeekDialog>
                )}
            </PageHeader>
            
            <WeekList weeks={weeksToShow} isLoading={loading} onDataChange={handleDataChange} canManage={isSupervisor} />
        </>
    );
}
