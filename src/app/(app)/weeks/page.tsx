
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { PlusCircle, Calendar, ClipboardList, Users, Home } from "lucide-react";
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
    const canManage = activeRole === 'Master' || activeRole === 'Administrador';

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


    const handleWeekAdded = () => {
        setRefreshSignal(prev => !prev);
    }

    const { activeWeeks, pastWeeks, dashboardStats } = useMemo(() => {
        const today = new Date();
        const active: Week[] = [];
        const past: Week[] = [];

        allWeeks.forEach(week => {
            const startDate = startOfDay(new Date(week.periodStartDate));
            const endDate = endOfDay(new Date(week.periodEndDate));
            if (isWithinInterval(today, { start: startDate, end: endDate })) {
                active.push(week);
            } else if (startDate < today) {
                past.push(week);
            }
        });
        
        const totalPendingTasks = allTasks.filter(task => task.status === 'Pendiente').length;
        const membersInService = active.reduce((acc, week) => acc + (week.allMembers?.length || 0), 0);
        
        const stats = {
            activeWeeksCount: active.length,
            pendingTasksCount: totalPendingTasks,
            membersInServiceCount: membersInService
        };

        return { activeWeeks: active, pastWeeks: past, dashboardStats: stats };
    }, [allWeeks, allTasks]);


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

    return (
        <>
            <PageHeader 
                title="Dashboard de Semanas" 
                description="Vista general del estado de las semanas y tareas."
            >
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/dashboard"><Home className="mr-2"/>Volver al Portal</Link>
                    </Button>
                    {canManage && (
                        <AddWeekDialog onWeekAdded={handleWeekAdded}>
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
                        <CardTitle className="text-sm font-medium">Semanas Activas</CardTitle>
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
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Personal de Guardia</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboardStats.membersInServiceCount}</div>
                    </CardContent>
                </Card>
            </div>
            
            <MyTasks allTasks={allTasks} allWeeks={allWeeks} />

            <Tabs defaultValue="active" className="w-full mt-8">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-4">
                    <TabsTrigger value="active">Semanas en Curso</TabsTrigger>
                    <TabsTrigger value="past">Semanas Pasadas</TabsTrigger>
                </TabsList>
                <TabsContent value="active">
                    <WeekList weeks={activeWeeks} />
                </TabsContent>
                <TabsContent value="past">
                     <WeekList weeks={pastWeeks} />
                </TabsContent>
            </Tabs>
        </>
    );
}
