
'use client';

import { PageHeader } from "@/components/page-header";
import { useEffect, useState, useMemo } from "react";
import WeekList from "./_components/week-list";
import { Week } from "@/lib/types";
import { getWeeks } from "@/services/weeks.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export default function WeeksDashboardPage() {
    const { toast } = useToast();
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [loading, setLoading] = useState(true);

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
    
    const { activeWeeksSummary, weeksToShow } = useMemo(() => {
        const today = new Date();
        const activeSummary: Record<string, string> = {
            'Cuartel 1': 'Ninguna',
            'Cuartel 2': 'Ninguna',
            'Cuartel 3': 'Ninguna'
        };

        weeks.forEach(week => {
            const startDate = startOfDay(parseISO(week.periodStartDate));
            const endDate = endOfDay(parseISO(week.periodEndDate));
            
            if (isWithinInterval(today, { start: startDate, end: endDate })) {
                if (activeSummary.hasOwnProperty(week.firehouse)) {
                    activeSummary[week.firehouse] = week.name;
                }
            }
        });

        const grouped = weeks.reduce((acc, week) => {
            const firehouse = week.firehouse || 'Sin Cuartel';
            if (!acc[firehouse]) {
                acc[firehouse] = [];
            }
            acc[firehouse].push(week);
            return acc;
        }, {} as Record<string, Week[]>);
        
        // Sort weeks inside each group
        for (const firehouse in grouped) {
            grouped[firehouse].sort((a,b) => parseISO(b.periodStartDate).getTime() - parseISO(a.periodStartDate).getTime());
        }

        return { 
            activeWeeksSummary: activeSummary,
            weeksToShow: grouped
        };
    }, [weeks]);

    const firehouseOrder = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
    
    return (
        <>
            <PageHeader 
                title="Semanas de Guardia" 
                description="Listado histórico de todas las semanas de guardia, agrupadas por cuartel."
            />
            
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="font-headline">Semanas Activas Actualmente</CardTitle>
                    <CardDescription>Resumen de las semanas de guardia en curso.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                           <Skeleton className="h-6 w-full" />
                           <Skeleton className="h-6 w-full" />
                           <Skeleton className="h-6 w-full" />
                        </div>
                    ) : (
                        <div className="text-sm space-y-2">
                            {Object.entries(activeWeeksSummary).map(([firehouse, weekName]) => (
                                <div key={firehouse} className="flex justify-between items-center p-2 rounded-md even:bg-muted/50">
                                    <span className="font-medium text-muted-foreground">{firehouse}:</span>
                                    <span className="font-semibold">{weekName}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-12">
               {firehouseOrder.map(firehouse => (
                    weeksToShow[firehouse] && weeksToShow[firehouse].length > 0 && (
                        <div key={firehouse} className="mb-8">
                            <h3 className="font-headline text-2xl font-semibold tracking-tight border-b pb-2 mb-4">{firehouse}</h3>
                            <WeekList 
                                weeks={weeksToShow[firehouse]} 
                                isLoading={loading} 
                                onDataChange={handleDataChange}
                                canManage={false} // This page is always read-only
                            />
                        </div>
                    )
                ))}
            </div>
        </>
    );
}
