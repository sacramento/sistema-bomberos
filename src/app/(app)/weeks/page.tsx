
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { PlusCircle, Calendar, ClipboardList, Home } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import AddWeekDialog from "./_components/add-week-dialog";
import WeekList from "./_components/week-list";
import { Week, Task } from "@/lib/types";
import { getWeeks } from "@/services/weeks.service";
import { getTasksByWeek } from "@/services/tasks.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import MyTasks from "./_components/my-tasks";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";


export default function WeeksPage() {
    const { getActiveRole } = useAuth();
    const { toast } = useToast();
    const pathname = usePathname();

    const [allWeeks, setAllWeeks] = useState<Week[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const [refreshSignal, setRefreshSignal] = useState(false);

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

    const fetchModuleData = async () => {
        setLoading(true);
        try {
            const weeksData = await getWeeks();
            setAllWeeks(weeksData);

            // Fetch tasks for all weeks
            const tasksPromises = weeksData.map(week => getTasksByWeek(week.id));
            const tasksByWeek = await Promise.all(tasksPromises);
            setAllTasks(tasksByWeek.flat());

        } catch (error) {
            toast({ title: "Error", description: "No se pudieron cargar los datos del módulo de semanas.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchModuleData();
    }, [refreshSignal, toast]);


    const handleDataChange = () => {
        setRefreshSignal(prev => !prev);
    }

    const { activeWeeks, pastWeeks, dashboardStats } = useMemo(() => {
        const today = new Date();
        const active: Week[] = [];
        const past: Week[] = [];
        
        const currentActiveWeeksByFirehouse: Record<string, string> = {
            'Cuartel 1': 'Ninguna',
            'Cuartel 2': 'Ninguna',
            'Cuartel 3': 'Ninguna'
        };

        allWeeks.forEach(week => {
            const startDate = startOfDay(new Date(week.periodStartDate));
            const endDate = endOfDay(new Date(week.periodEndDate));
            if (new Date(week.periodEndDate) < today) {
                past.push(week);
            } else {
                 active.push(week); 
            }
            
            if (isWithinInterval(today, { start: startDate, end: endDate })) {
                if (currentActiveWeeksByFirehouse.hasOwnProperty(week.firehouse)) {
                    currentActiveWeeksByFirehouse[week.firehouse] = week.name;
                }
            }
        });
        
        const totalPendingTasks = allTasks.filter(task => task.status === 'Pendiente').length;
        
        const stats = {
            activeWeeksCount: active.length,
            pendingTasksCount: totalPendingTasks,
            activeWeeksByFirehouse: currentActiveWeeksByFirehouse,
        };

        return { 
            activeWeeks: active.sort((a,b) => new Date(a.periodStartDate).getTime() - new Date(b.periodStartDate).getTime()), 
            pastWeeks: past.sort((a,b) => new Date(b.periodStartDate).getTime() - new Date(a.periodStartDate).getTime()), 
            dashboardStats: stats 
        };
    }, [allWeeks, allTasks]);


    const weeksByFirehouse = (weekList: Week[]) => {
        return weekList.reduce((acc, week) => {
            const firehouse = week.firehouse || 'Sin Cuartel';
            if (!acc[firehouse]) {
                acc[firehouse] = [];
            }
            acc[firehouse].push(week);
            return acc;
        }, {} as Record<string, Week[]>);
    }

    const activeWeeksGrouped = weeksByFirehouse(activeWeeks);
    const pastWeeksGrouped = weeksByFirehouse(pastWeeks);
    const firehouseOrder = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

    if (loading) {
        return (
             <>
                <PageHeader title="Gestión de Semanas" description="Organice al personal en semanas, asigne tareas y supervise la actividad.">
                     <Skeleton className="h-10 w-44" />
                </PageHeader>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
                     {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-28" />)}
                </div>
                 <Skeleton className="h-40 w-full" />
                 <Skeleton className="h-64 w-full mt-8" />
             </>
        )
    }

    const renderWeekGroups = (groupedWeeks: Record<string, Week[]>) => {
        return firehouseOrder.map(firehouse => (
            groupedWeeks[firehouse] && groupedWeeks[firehouse].length > 0 && (
                <div key={firehouse} className="space-y-4">
                    <h2 className="font-headline text-2xl font-semibold tracking-tight border-b pb-2">{firehouse}</h2>
                    <WeekList weeks={groupedWeeks[firehouse]} isLoading={loading} onDataChange={handleDataChange} />
                </div>
            )
        ));
    };

    return (
        <>
            <PageHeader 
                title="Dashboard de Semanas" 
                description="Vista general del estado de las semanas y tareas."
            >
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/dashboard"><Home className="mr-2"/>Inicio</Link>
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

             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Semanas Activas/Futuras</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboardStats.activeWeeksCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tareas Pendientes</CardTitle>
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboardStats.pendingTasksCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Semanas Activas Hoy</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                         {Object.entries(dashboardStats.activeWeeksByFirehouse).map(([firehouse, weekName]) => (
                            <div key={firehouse} className="flex justify-between">
                                <span className="text-muted-foreground">{firehouse}:</span>
                                <span className="font-semibold">{weekName}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
            
            <MyTasks allTasks={allTasks} allWeeks={allWeeks} />

            <Tabs defaultValue="active" className="w-full mt-8">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-4">
                    <TabsTrigger value="active">Semanas en Curso y Futuras</TabsTrigger>
                    <TabsTrigger value="past">Semanas Pasadas</TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="space-y-8">
                    {renderWeekGroups(activeWeeksGrouped)}
                </TabsContent>
                <TabsContent value="past" className="space-y-8">
                     {renderWeekGroups(pastWeeksGrouped)}
                </TabsContent>
            </Tabs>
        </>
    );
}
