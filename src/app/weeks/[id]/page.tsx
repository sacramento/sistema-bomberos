
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Week, Task, Firefighter } from "@/lib/types";
import { getWeekById } from "@/services/weeks.service";
import { getTasksByWeek, updateTask } from "@/services/tasks.service";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Users, Truck, User, PlusCircle, CheckCircle2, ListTodo, UserCog } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import AddTaskDialog from "../_components/add-task-dialog";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";


const getStatusVariant = (status: Task['status']) => {
    switch (status) {
        case 'Pendiente': return 'default';
        case 'En Progreso': return 'secondary';
        case 'Completada': return 'destructive'; // Using destructive for a 'done' state, can be changed
        default: return 'outline';
    }
}
const getStatusBadgeColor = (status: Task['status']) => {
    switch (status) {
        case 'Pendiente': return 'bg-yellow-500 text-black';
        case 'En Progreso': return 'bg-blue-500';
        case 'Completada': return 'bg-green-600';
        default: return '';
    }
};

const taskStatuses: Task['status'][] = ['Pendiente', 'En Progreso', 'Completada'];

export default function WeekDetailPage() {
    const params = useParams();
    const weekId = params.id as string;
    const { toast } = useToast();
    const { user } = useAuth();

    const [week, setWeek] = useState<Week | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const canManageTasks = user?.role === 'Administrador' || user?.id === week?.lead?.legajo;

    const fetchWeekAndTasks = async () => {
        if (weekId) {
            setLoading(true);
            try {
                const weekData = await getWeekById(weekId);
                setWeek(weekData);
                if (weekData) {
                    const taskData = await getTasksByWeek(weekData.id);
                    setTasks(taskData);
                }
            } catch (error) {
                toast({ title: "Error", description: "No se pudo cargar la información de la semana.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchWeekAndTasks();
    }, [weekId, toast]);

    const refreshTasks = () => {
        if(week) {
            getTasksByWeek(week.id).then(setTasks);
        }
    }

    const handleTaskAdded = () => {
       toast({
            title: "Tarea agregada",
            description: "La tarea ha sido creada y asignada correctamente."
        });
        refreshTasks();
    }
    
    const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
        try {
            await updateTask(taskId, { status: newStatus });
            toast({
                title: "Estado actualizado",
                description: `La tarea se ha marcado como "${newStatus}".`
            });
            refreshTasks();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo actualizar el estado de la tarea.", variant: "destructive" });
        }
    };


    if (loading) {
        return (
            <>
                <PageHeader 
                    title={<Skeleton className="h-9 w-64" />} 
                    description={<Skeleton className="h-5 w-48" />} 
                >
                    <Skeleton className="h-10 w-36" />
                </PageHeader>
                <div className="grid gap-8 md:grid-cols-3">
                    <div className="md:col-span-2 space-y-8">
                         <Skeleton className="h-48 w-full" />
                         <Skeleton className="h-64 w-full" />
                    </div>
                    <div className="space-y-8">
                         <Skeleton className="h-96 w-full" />
                    </div>
                </div>
            </>
        )
    }

    if (!week) {
        return <PageHeader title="Semana no encontrada" description="No se pudo encontrar la semana solicitada." />;
    }

    return (
        <>
            <PageHeader 
                title={week.name}
                description={`${format(new Date(week.periodStartDate), "dd MMM yyyy", { locale: es })} - ${format(new Date(week.periodEndDate), "dd MMM yyyy", { locale: es })}`}
            >
                {canManageTasks && (
                    <AddTaskDialog week={week} onTaskAdded={handleTaskAdded}>
                        <Button>
                            <PlusCircle className="mr-2" />
                            Agregar Tarea
                        </Button>
                    </AddTaskDialog>
                )}
            </PageHeader>

            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2 space-y-8">
                    {/* Observations Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Pizarra de Novedades</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {week.observations ? (
                                <p className="text-muted-foreground whitespace-pre-wrap">{week.observations}</p>
                            ): (
                                <p className="text-muted-foreground">No hay novedades para esta semana.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tasks Card */}
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2"><ListTodo /> Tareas de la Semana</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {tasks.length > 0 ? (
                                <div className="space-y-6">
                                    {tasks.map(task => (
                                        <div key={task.id} className="p-4 border rounded-lg">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-1 flex-grow">
                                                    <h3 className="font-semibold text-lg">{task.title}</h3>
                                                    {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                                                </div>
                                                 <Select 
                                                    value={task.status} 
                                                    onValueChange={(newStatus) => handleStatusChange(task.id, newStatus as Task['status'])}
                                                    disabled={!canManageTasks}
                                                >
                                                    <SelectTrigger className={cn("w-[180px] flex-shrink-0", getStatusBadgeColor(task.status))}>
                                                        <SelectValue placeholder="Seleccionar estado" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {taskStatuses.map(status => (
                                                            <SelectItem key={status} value={status}>{status}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Separator className="my-3"/>
                                            <div className="flex items-center justify-between text-sm">
                                                 <div className="flex items-center gap-2 font-medium">
                                                    <UserCog className="h-4 w-4"/>
                                                    Asignado a:
                                                 </div>
                                                 <div className="flex flex-wrap gap-1 justify-end">
                                                    {task.assignedTo && task.assignedTo.length > 0 ?
                                                        task.assignedTo.map(f => <Badge key={f.id} variant="secondary">{f.lastName}</Badge>) :
                                                        <Badge variant="outline">Nadie</Badge>
                                                    }
                                                 </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                 <div className="flex flex-col items-center justify-center h-48 text-center border-2 border-dashed rounded-lg">
                                    <CheckCircle2 className="h-10 w-10 text-green-500 mb-2"/>
                                    <p className="text-muted-foreground">No hay tareas asignadas para esta semana.</p>
                                    {canManageTasks && <p className="text-sm text-muted-foreground mt-2">Use el botón "Agregar Tarea" para comenzar.</p>}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Members Card */}
                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                             <CardTitle className="font-headline flex items-center gap-2"><Users /> Integrantes</CardTitle>
                             <CardDescription>{week.allMembers?.length || 0} integrantes en esta semana.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {week.lead && (
                                    <li className="flex items-center gap-3">
                                        <User className="h-5 w-5 text-primary"/>
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{`${week.lead.firstName} ${week.lead.lastName}`}</span>
                                            <Badge>Encargado</Badge>
                                        </div>
                                    </li>
                                )}
                                 {week.driver && (
                                    <li className="flex items-center gap-3">
                                        <Truck className="h-5 w-5 text-primary"/>
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{`${week.driver.firstName} ${week.driver.lastName}`}</span>
                                            <Badge variant="secondary">Chofer</Badge>
                                        </div>
                                    </li>
                                )}
                                {week.members?.map(member => (
                                     <li key={member.id} className="flex items-center gap-3 pl-8">
                                        <div className="flex flex-col">
                                            <span>{`${member.firstName} ${member.lastName}`}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}
