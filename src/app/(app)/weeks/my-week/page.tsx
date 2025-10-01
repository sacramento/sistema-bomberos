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
    const [userWeeks, setUserWeeks] = useState<Week[]>([]);
    const [loading, setLoading] = useState(true);

    const activeRole = getActiveRole(pathname);
    const canCreateWeek = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

    const fetchUserWeeks = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const allWeeksData = await getWeeks();
            
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
                // We don't call setLoading(false) as the component will unmount upon redirection.
                return; 
            }
            
            setUserWeeks(assignedWeeks);

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
        fetchUserWeeks();
    }, [user, router, toast]);

    const handleDataChange = () => {
        fetchUserWeeks();
    };

    if (loading) {
        return (
             <>
                <PageHeader title="Mis Semanas" description="Gestiona y visualiza tus semanas de guardia asignadas.">
                    {canCreateWeek && <Skeleton className="h-10 w-36" />}
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
                {canCreateWeek && (
                    <AddWeekDialog onWeekAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Semana
                        </Button>
                    </AddWeekDialog>
                )}
            </PageHeader>
            
            <WeekList weeks={userWeeks} isLoading={loading} onDataChange={handleDataChange} canManage={true} />
        </>
    );
}
