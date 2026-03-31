
'use client';

import { PageHeader } from "@/components/page-header";
import { useEffect, useState, useMemo } from "react";
import WeekList from "./_components/week-list";
import { Week, Firefighter } from "@/lib/types";
import { getWeeks } from "@/services/weeks.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import AddWeekDialog from "./_components/add-week-dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function WeeksDashboardPage() {
    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const activeRole = getActiveRole('/weeks');
    const isMaster = activeRole === 'Master';
    const isLocalAdmin = activeRole === 'Administrador';

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [weeksData, firefightersData] = await Promise.all([
                getWeeks(),
                getFirefighters()
            ]);
            setWeeks(weeksData);
            setFirefighters(firefightersData);
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo cargar el listado de semanas.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const handleDataChange = () => {
        fetchAllData();
    }
    
    const loggedInFirefighter = useMemo(() => {
        if (!user || firefighters.length === 0) return null;
        return firefighters.find(f => f.legajo === user.id) || null;
    }, [user, firefighters]);

    const filteredWeeks = useMemo(() => {
        if (!mounted || !user) return [];
        // El Master ve todo. Los demás solo ven su cuartel.
        if (isMaster) return weeks;
        if (!loggedInFirefighter) return [];
        
        return weeks.filter(w => w.firehouse === loggedInFirefighter.firehouse);
    }, [weeks, mounted, user, isMaster, loggedInFirefighter]);

    const weeksGrouped = useMemo(() => {
        if (!mounted) return {};

        const grouped = filteredWeeks.reduce((acc, week) => {
            const firehouse = week.firehouse || 'Sin Cuartel';
            if (!acc[firehouse]) {
                acc[firehouse] = [];
            }
            acc[firehouse].push(week);
            return acc;
        }, {} as Record<string, Week[]>);
        
        return grouped;
    }, [filteredWeeks, mounted]);

    const firehouseOrder = isMaster 
        ? ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'] 
        : (loggedInFirefighter?.firehouse ? [loggedInFirefighter.firehouse] : []);
    
    return (
        <>
            <PageHeader 
                title="Semanas de Guardia" 
                description={isMaster ? "Listado general de guardias por cuartel." : `Guardias de ${loggedInFirefighter?.firehouse || 'mi cuartel'}`}
            >
                {(isMaster || isLocalAdmin) && (
                    <AddWeekDialog onWeekAdded={handleDataChange} loggedInFirefighter={loggedInFirefighter}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Semana
                        </Button>
                    </AddWeekDialog>
                )}
            </PageHeader>
            
            <div className="space-y-12">
               {loading || !mounted ? (
                   <div className="space-y-8">
                       {Array.from({ length: 3 }).map((_, i) => (
                           <div key={i} className="space-y-4">
                               <Skeleton className="h-8 w-48" />
                               <Skeleton className="h-32 w-full" />
                           </div>
                       ))}
                   </div>
               ) : (
                   firehouseOrder.map(firehouse => (
                        weeksGrouped[firehouse] && weeksGrouped[firehouse].length > 0 ? (
                            <div key={firehouse} className="mb-8">
                                <h3 className="font-headline text-2xl font-semibold tracking-tight border-b pb-2 mb-4">{firehouse}</h3>
                                <WeekList 
                                    weeks={weeksGrouped[firehouse]} 
                                    isLoading={loading} 
                                    onDataChange={handleDataChange}
                                    canManageGenerally={isMaster || isLocalAdmin} 
                                    loggedInFirefighter={loggedInFirefighter}
                                />
                            </div>
                        ) : null
                    ))
               )}
               {!loading && filteredWeeks.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg bg-muted/10">
                       <p className="text-muted-foreground">No hay semanas registradas para mostrar.</p>
                   </div>
               )}
            </div>
        </>
    );
}
