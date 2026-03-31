
'use client';

import { PageHeader } from "@/components/page-header";
import { useEffect, useState, useMemo } from "react";
import WeekList from "./_components/week-list";
import { Week } from "@/lib/types";
import { getWeeks } from "@/services/weeks.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function WeeksDashboardPage() {
    const { toast } = useToast();
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchWeeks = async () => {
        setLoading(true);
        try {
            const data = await getWeeks();
            setWeeks(data);
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
        fetchWeeks();
    }, [toast]);
    
    const handleDataChange = () => {
        fetchWeeks();
    }
    
    const weeksToShow = useMemo(() => {
        if (!mounted) return {};

        const grouped = weeks.reduce((acc, week) => {
            const firehouse = week.firehouse || 'Sin Depósito';
            if (!acc[firehouse]) {
                acc[firehouse] = [];
            }
            acc[firehouse].push(week);
            return acc;
        }, {} as Record<string, Week[]>);
        
        // Take the last 6 weeks per firehouse
        for (const firehouse in grouped) {
            grouped[firehouse] = grouped[firehouse].slice(0, 6); 
        }

        return grouped;
    }, [weeks, mounted]);

    const firehouseOrder = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
    
    return (
        <>
            <PageHeader 
                title="Historial de Semanas de Guardia" 
                description="Listado de las semanas de guardia registradas, agrupadas por cuartel."
            />
            
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
                        weeksToShow[firehouse] && weeksToShow[firehouse].length > 0 && (
                            <div key={firehouse} className="mb-8">
                                <h3 className="font-headline text-2xl font-semibold tracking-tight border-b pb-2 mb-4">{firehouse}</h3>
                                <WeekList 
                                    weeks={weeksToShow[firehouse]} 
                                    isLoading={loading} 
                                    onDataChange={handleDataChange}
                                    canManageGenerally={false} 
                                    loggedInFirefighter={null}
                                />
                            </div>
                        )
                    ))
               )}
            </div>
        </>
    );
}
