
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Home } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import AddWeekDialog from "./_components/add-week-dialog";
import WeekList from "./_components/week-list";
import { Week } from "@/lib/types";
import { getWeeks } from "@/services/weeks.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import Link from "next/link";


export default function WeeksPage() {
    const { getActiveRole } = useAuth();
    const pathname = usePathname();
    const { toast } = useToast();
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [loading, setLoading] = useState(true);

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

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
    
    const { activeWeeks, pastWeeks, activeWeeksSummary } = useMemo(() => {
        const today = new Date();
        const active: Week[] = [];
        const past: Week[] = [];
        const activeSummary: Record<string, string> = {
            'Cuartel 1': 'Ninguna',
            'Cuartel 2': 'Ninguna',
            'Cuartel 3': 'Ninguna'
        };

        weeks.forEach(week => {
            const startDate = startOfDay(parseISO(week.periodStartDate));
            const endDate = endOfDay(parseISO(week.periodEndDate));

            if (new Date(week.periodEndDate) < startOfDay(today)) {
                past.push(week);
            } else {
                 active.push(week); 
            }
            
            if (isWithinInterval(today, { start: startDate, end: endDate })) {
                if (activeSummary.hasOwnProperty(week.firehouse)) {
                    activeSummary[week.firehouse] = week.name;
                }
            }
        });

        return { 
            activeWeeks: active.sort((a,b) => new Date(a.periodStartDate).getTime() - new Date(b.periodStartDate).getTime()), 
            pastWeeks: past.sort((a,b) => new Date(b.periodStartDate).getTime() - new Date(a.periodStartDate).getTime()), 
            activeWeeksSummary: activeSummary 
        };
    }, [weeks]);

    const activeWeeksGrouped = useMemo(() => {
        return activeWeeks.reduce((acc, week) => {
            const firehouse = week.firehouse || 'Sin Cuartel';
            if (!acc[firehouse]) {
                acc[firehouse] = [];
            }
            acc[firehouse].push(week);
            return acc;
        }, {} as Record<string, Week[]>);
    }, [activeWeeks]);

    const pastWeeksGrouped = useMemo(() => {
        return pastWeeks.reduce((acc, week) => {
            const firehouse = week.firehouse || 'Sin Cuartel';
            if (!acc[firehouse]) {
                acc[firehouse] = [];
            }
            acc[firehouse].push(week);
            return acc;
        }, {} as Record<string, Week[]>);
    }, [pastWeeks]);

    const firehouseOrder = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
    
    const renderWeekGroups = (groupedWeeks: Record<string, Week[]>, title: string) => {
        const hasData = Object.values(groupedWeeks).some(w => w.length > 0);
        return (
            <div>
                 <h2 className="font-headline text-3xl font-semibold tracking-tight mb-4">{title}</h2>
                 {hasData ? firehouseOrder.map(firehouse => (
                    groupedWeeks[firehouse] && groupedWeeks[firehouse].length > 0 && (
                        <div key={firehouse} className="mb-8">
                            <h3 className="font-headline text-2xl font-semibold tracking-tight border-b pb-2 mb-4">{firehouse}</h3>
                            <WeekList weeks={groupedWeeks[firehouse]} isLoading={loading} onDataChange={handleDataChange} />
                        </div>
                    )
                )) : (
                     <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No hay semanas en esta categoría.</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <PageHeader 
                title="Semanas de Guardia" 
                description="Listado histórico de todas las semanas de guardia, agrupadas por cuartel."
            >
                 <div className="flex items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/sessions"><Home className="mr-2"/>Inicio</Link>
                    </Button>
                    {canManage && (
                        <AddWeekDialog onWeekAdded={handleDataChange}>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Crear Semana
                            </Button>
                        </AddWeekDialog>
                    )}
                </div>
            </PageHeader>
            
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
               {renderWeekGroups(activeWeeksGrouped, 'Semanas en Curso y Futuras')}
               {renderWeekGroups(pastWeeksGrouped, 'Semanas Pasadas')}
            </div>
        </>
    );
}
