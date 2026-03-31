
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Week, Task, Firefighter } from "@/lib/types";
import { getWeekById, updateWeek } from "@/services/weeks.service";
import { getTasksByWeek, updateTask, deleteTask } from "@/services/tasks.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Users, Truck, User, PlusCircle, CheckCircle2, ListTodo, UserCog, Save, Loader2, ArrowLeft, MoreVertical, Edit, Trash2, CalendarDays } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import AddTaskDialog from "../_components/add-task-dialog";
import EditTaskDialog from "../_components/edit-task-dialog";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';

const getStatusBadgeColor = (status: Task['status']) => {
    switch (status) {
        case 'Pendiente': return 'bg-yellow-500 text-black';
        case 'Completada': return 'bg-green-600 text-white';
        default: return '';
    }
};

const taskStatuses: Task['status'][] = ['Pendiente', 'Completada'];

export default function WeekDetailPage() {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const weekId = params.id as string;
    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();

    const [week, setWeek] = useState<Week | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [observations, setObservations] = useState('');
    const [savingObservations, setSavingObservations] = useState(false);

    const activeRole = getActiveRole(pathname);

    const loggedInFirefighter = useMemo(() => {
        if (!user || !allFirefighters.length) return null;
        return allFirefighters.find(f => f.legajo === user.id);
    }, [user, allFirefighters]);
    
    const canManage = useMemo(() => {
        if (!user || !week) return false;
        if (activeRole === 'Master') return true;
        
        // Si es el encargado específico de ESTA semana (Lead)
        if (week.leadId === user.id) return true;

        // Si es Administrador o Encargado del módulo para este cuartel
        if (activeRole === 'Administrador' || activeRole === 'Encargado') {
            return loggedInFirefighter?.firehouse === week.firehouse;
        }
        return false;
    }, [user, week, activeRole, loggedInFirefighter]);

    const canView = useMemo(() => {
        if (canManage) return true;
        if (activeRole === 'Oficial') return true;
        if (activeRole === 'Administrador' && loggedInFirefighter?.firehouse === week?.firehouse) return true;
        if (!user || !week || !week.allMembers) return false;
        return week.allMembers.some(member => member && member.legajo === user.id);
    }, [canManage, user, week, activeRole, loggedInFirefighter]);
    

    const fetchWeekAndTasks = async () => {
        if (weekId) {
            setLoading(true);
            try {
                 const [weekData, taskData, firefightersData] = await Promise.all([
                    getWeekById(weekId),
                    getTasksByWeek(weekId),
                    getFirefighters()
                ]);

                setWeek(weekData);
                setAllFirefighters(firefightersData);
                if (weekData) {
                    setObservations(weekData.observations || '');
                    setTasks(taskData);
                }
            } catch (error) {
                console.error(error);
                toast({ title: "Error", description: "No se pudo cargar la información de la semana.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchWeekAndTasks();
    }, [weekId]);

    const refreshTasks = () => {
        if(week) {
            getTasksByWeek(week.id).then(setTasks);
        }
    }

    const handleTaskChange = () => {
        refreshTasks();
    }
    
    const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
        try {
            await updateTask(taskId, { status: newStatus }, user);
            toast({
                title: "Estado actualizado",
                description: `La tarea se ha marcado como "${newStatus}".`
            });
            refreshTasks();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo actualizar el estado de la tarea.", variant: "destructive" });
        }
    };

     const handleDeleteTask = async (taskId: string) => {
        try {
            await deleteTask(taskId, user);
            toast({ title: "Tarea eliminada", description: "La tarea ha sido eliminada correctamente." });
            refreshTasks();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar la tarea.", variant: "destructive" });
        }
    };
    
    const handleSaveObservations = async () => {
        if (!week) return;
        setSavingObservations(true);
        try {
            await updateWeek(week.id, { observations }, user);
            toast({ title: "¡Hecho!", description: "La pizarra de novedades ha sido actualizada." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo guardar la pizarra de novedades.", variant: "destructive" });
        } finally {
            setSavingObservations(false);
        }
    };


    if (loading) {
        return (
            <div className="space-y-8">
                <PageHeader title={<Skeleton className="h-9 w-64" />} description={<Skeleton className="h-5 w-48" />} />
                <div className="grid gap-8 md:grid-cols-3">
                    <div className="md:col-span-2 space-y-8">
                         <Skeleton className="h-48 w-full" />
                         <Skeleton className="h-64 w-full" />
                    </div>
                    <div className="space-y-8">
                         <Skeleton className="h-96 w-full" />
                    </div>
                </div>
            </div>
        )
    }

    if (!canView || !week) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <h2 className="text-2xl font-bold mb-2 text-destructive">Acceso Denegado</h2>
                <p className="text-muted-foreground mb-6">No tienes permisos para ver los detalles de esta semana de guardia.</p>
                <Button onClick={() => router.push('/weeks/my-week')}>Volver a Mis Semanas</Button>
            </div>
        );
    }
    
    const activeMembers = week.allMembers?.filter(m => m.status === 'Active' || m.status === 'Auxiliar') || [];


    return (
        <>
            <PageHeader 
                title={week.name}
                description={`Cuartel: ${week.firehouse}`}
            >
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push('/weeks/my-week')}>
                        <ArrowLeft className="mr-2 h-4 w-4"/>
                        Volver
                    </Button>
                    {canManage && (
                        <AddTaskDialog week={week} onTaskAdded={handleTaskChange}>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Agregar Tarea
                            </Button>
                        </AddTaskDialog>
                    )}
                </div>
            </PageHeader>

            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2 space-y-8">
                    {/* Observations Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-xl">Pizarra de Novedades</CardTitle>
                            <CardDescription>Información importante y novedades para el personal de guardia.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           {canManage ? (
                               <div className="space-y-4">
                                   <Textarea 
                                       placeholder="Escriba aquí las novedades de la semana..."
                                       value={observations}
                                       onChange={(e) => setObservations(e.target.value)}
                                       className="min-h-[150px] text-sm"
                                   />
                                   <Button onClick={handleSaveObservations} disabled={savingObservations}>
                                       {savingObservations ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                       Guardar Novedades
                                   </Button>
                               </div>
                           ) : (
                                observations ? (
                                    <div className="bg-muted/30 p-4 rounded-lg border border-dashed">
                                        <p className="text-sm whitespace-pre-wrap">{observations}</p>
                                    </div>
                                ): (
                                    <p className="text-muted-foreground text-sm italic">No hay novedades registradas para esta semana.</p>
                                )
                           )}
                        </CardContent>
                    </Card>

                    {/* Tasks Card */}
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-xl flex items-center gap-2"><ListTodo className="h-5 w-5 text-primary" /> Tareas de la Semana</CardTitle>
                            <CardDescription>Seguimiento de actividades obligatorias.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {tasks.length > 0 ? (
                                <div className="space-y-4">
                                    {tasks.map(task => (
                                        <AlertDialog key={task.id}>
                                            <div className="p-4 border rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                    <div className="space-y-1 flex-grow">
                                                        <div className="flex justify-between items-start">
                                                            <h3 className="font-bold text-base">{task.title}</h3>
                                                            {canManage && (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2">
                                                                            <MoreVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                        <EditTaskDialog week={week} task={task} onTaskUpdated={handleTaskChange}>
                                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                                <Edit className="mr-2 h-4 w-4" /> Editar Tarea
                                                                            </DropdownMenuItem>
                                                                        </EditTaskDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                                                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Tarea
                                                                            </DropdownMenuItem>
                                                                        </AlertDialogTrigger>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            )}
                                                        </div>
                                                        {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                                                        {(task.startDate || task.endDate) && (
                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 uppercase font-bold">
                                                                <CalendarDays className="h-3 w-3" />
                                                                <span>
                                                                    {task.startDate ? format(parseISO(task.startDate), 'dd/MM') : ''}
                                                                    {task.endDate && task.startDate !== task.endDate ? ` al ${format(parseISO(task.endDate), 'dd/MM')}` : ''}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="w-full sm:w-auto">
                                                        <Select 
                                                            value={task.status} 
                                                            onValueChange={(newStatus) => handleStatusChange(task.id, newStatus as Task['status'])}
                                                            disabled={!canManage}
                                                        >
                                                            <SelectTrigger className={cn("w-full sm:w-[140px] h-8 text-[10px] font-bold uppercase", getStatusBadgeColor(task.status))}>
                                                                <SelectValue placeholder="Estado" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {taskStatuses.map(status => (
                                                                    <SelectItem key={status} value={status} className="text-xs uppercase font-bold">{status}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <Separator className="my-3"/>
                                                <div className="flex items-center justify-between text-[10px] uppercase">
                                                    <div className="flex items-center gap-2 font-bold text-muted-foreground">
                                                        <UserCog className="h-3 w-3"/>
                                                        Responsables:
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 justify-end">
                                                        {task.assignedTo && task.assignedTo.length > 0 ?
                                                            task.assignedTo.map(f => <Badge key={f.id} variant="secondary" className="text-[9px] h-5">{f.lastName}</Badge>) :
                                                            <Badge variant="outline" className="text-[9px] h-5">Sin asignar</Badge>
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Eliminar esta tarea?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción no se puede deshacer. La tarea "{task.title}" será eliminada permanentemente de esta semana.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteTask(task.id)} variant="destructive">
                                                        Eliminar Tarea
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    ))}
                                </div>
                            ) : (
                                 <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-muted/10">
                                    <CheckCircle2 className="h-10 w-10 text-green-500/50 mb-3"/>
                                    <p className="text-sm font-medium text-muted-foreground">No hay tareas asignadas para esta semana.</p>
                                    {canManage && <p className="text-xs text-muted-foreground mt-1">Usa el botón superior para agregar una actividad.</p>}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Members Card */}
                <div className="space-y-8">
                    <Card className="shadow-md border-primary/10">
                        <CardHeader className="bg-primary/5 border-b">
                             <CardTitle className="font-headline text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Dotación Actual</CardTitle>
                             <CardDescription className="text-xs font-bold uppercase">{activeMembers.length} Integrantes activos</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-6">
                                {week.lead && (week.lead.status === 'Active' || week.lead.status === 'Auxiliar') && (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                            <User className="h-6 w-6"/>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm leading-tight">{`${week.lead.firstName} ${week.lead.lastName}`}</span>
                                            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Encargado de Semana</span>
                                        </div>
                                    </div>
                                )}
                                 {week.driver && (week.driver.status === 'Active' || week.driver.status === 'Auxiliar') && (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Truck className="h-6 w-6"/>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm leading-tight">{`${week.driver.firstName} ${week.driver.lastName}`}</span>
                                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Chofer Designado</span>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-1">Resto de la Dotación</Label>
                                    <div className="grid gap-2">
                                        {week.members?.filter(m => m.status === 'Active' || m.status === 'Auxiliar').map(member => (
                                            <div key={member.id} className="flex items-center gap-3 p-2 border rounded-md hover:bg-muted/30 transition-colors">
                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
                                                    {member.legajo.slice(-2)}
                                                </div>
                                                <span className="text-sm font-medium">{`${member.firstName} ${member.lastName}`}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}
