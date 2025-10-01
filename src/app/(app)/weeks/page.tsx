
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { PlusCircle, Calendar, ClipboardList, Users, Home, MoreVertical, Edit, Trash2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import AddWeekDialog from "./_components/add-week-dialog";
import WeekList from "./_components/week-list";
import { Week, Task } from "@/lib/types";
import { getWeeks, deleteWeek } from "@/services/weeks.service";
import { getTasksByWeek } from "@/services/tasks.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import MyTasks from "./_components/my-tasks";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import EditWeekDialog from "./_components/edit-week-dialog";
import { ArrowRight, User, Truck } from "lucide-react";

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

    const handleDeleteWeek = async (weekId: string) => {
        try {
            await deleteWeek(weekId);
            toast({ title: "Éxito", description: "La semana y sus tareas asociadas han sido eliminadas." });
            handleDataChange();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo eliminar la semana.", variant: "destructive" });
        }
    };

    const { activeWeeks, pastWeeks, dashboardStats } = useMemo(() => {
        const today = new Date();
        const active: Week[] = [];
        const past: Week[] = [];

        allWeeks.forEach(week => {
            const startDate = startOfDay(new Date(week.periodStartDate));
            const endDate = endOfDay(new Date(week.periodEndDate));
            if (isWithinInterval(today, { start: startDate, end: endDate })) {
                active.push(week);
            } else if (new Date(week.periodEndDate) < today) {
                past.push(week);
            } else {
                 active.push(week); // Also consider future weeks as "active" for visibility
            }
        });
        
        const totalPendingTasks = allTasks.filter(task => task.status === 'Pendiente').length;
        const membersInService = active.reduce((acc, week) => acc + (week.allMembers?.length || 0), 0);
        
        const stats = {
            activeWeeksCount: active.length,
            pendingTasksCount: totalPendingTasks,
            membersInServiceCount: membersInService
        };

        return { activeWeeks: active.sort((a,b) => new Date(a.periodStartDate).getTime() - new Date(b.periodStartDate).getTime()), pastWeeks: past, dashboardStats: stats };
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
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Personal de Guardia (Actualmente)</CardTitle>
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
                    <TabsTrigger value="active">Semanas en Curso y Futuras</TabsTrigger>
                    <TabsTrigger value="past">Semanas Pasadas</TabsTrigger>
                </TabsList>
                <TabsContent value="active">
                    <WeekList weeks={activeWeeks} isLoading={loading} onDataChange={handleDataChange} />
                </TabsContent>
                <TabsContent value="past">
                     <WeekList weeks={pastWeeks} isLoading={loading} onDataChange={handleDataChange} />
                </TabsContent>
            </Tabs>
        </>
    );
}

interface WeekListProps {
    weeks: Week[];
    isLoading?: boolean;
    onDataChange: () => void;
}

function WeekList({ weeks, isLoading, onDataChange }: WeekListProps) {
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

    const handleDeleteWeek = async (weekId: string) => {
        try {
            await deleteWeek(weekId);
            toast({ title: "Éxito", description: "La semana y sus tareas asociadas han sido eliminadas." });
            onDataChange();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo eliminar la semana.", variant: "destructive" });
        }
    };

    if (isLoading) {
        return (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-5/6" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        );
    }
    
    const filteredWeeks = useMemo(() => {
        if (!user || activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Oficial') {
            return weeks;
        }
        return weeks.filter(week => 
            week.allMembers?.some(member => member.legajo === user.id)
        );
    }, [weeks, user, activeRole]);
    
    if (filteredWeeks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">No hay semanas para mostrar</h2>
                     <p className="text-muted-foreground mt-2">
                        {user && (activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Oficial')
                         ? 'Cree una nueva semana para comenzar.'
                         : 'No estás asignado a ninguna semana en esta categoría.'
                        }
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredWeeks.map((week) => (
                 <AlertDialog key={week.id}>
                    <Card className="flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="font-headline text-xl">{week.name}</CardTitle>
                                {canManage ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                            <EditWeekDialog week={week} onWeekUpdated={onDataChange}>
                                                 <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                                </DropdownMenuItem>
                                            </EditWeekDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                     <Badge variant="secondary">{week.firehouse}</Badge>
                                )}
                            </div>
                            <CardDescription>
                                {format(new Date(week.periodStartDate), "dd 'de' LLL", { locale: es })} - {format(new Date(week.periodEndDate), "dd 'de' LLL, yyyy", { locale: es })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-muted-foreground"/>
                                <span className="font-medium">Encargado:</span>
                                <span className="text-muted-foreground">{week.lead?.lastName || 'N/A'}</span>
                            </div>
                             <div className="flex items-center gap-2 text-sm">
                                <Truck className="h-4 w-4 text-muted-foreground"/>
                                <span className="font-medium">Chofer:</span>
                                <span className="text-muted-foreground">{week.driver?.lastName || 'N/A'}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full" variant="outline">
                                <Link href={`/weeks/${week.id}`}>
                                    Ver Detalles <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente la semana "{week.name}" y todas sus tareas asociadas.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteWeek(week.id)} variant="destructive">
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                 </AlertDialog>
            ))}
        </div>
    )
}
