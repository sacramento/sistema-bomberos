
'use client';

import { PageHeader } from "@/components/page-header";
import { useEffect, useState, useMemo } from "react";
import { Task, Week, Firefighter } from "@/lib/types";
import { getAllTasks, deleteTask, updateTask } from "@/services/tasks.service";
import { getWeeks } from "@/services/weeks.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/context/auth-context";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import EditTaskDialog from "../_components/edit-task-dialog";

const getStatusBadgeColor = (status: Task['status']) => {
    switch (status) {
        case 'Pendiente': return 'bg-yellow-500 text-black hover:bg-yellow-500/90';
        case 'Completada': return 'bg-green-600 text-white hover:bg-green-600/90';
        default: return '';
    }
};

export default function AllTasksPage() {
    const { user, getActiveRole } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const activeRole = getActiveRole('/weeks/tasks');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [taskData, weekData, firefighterData] = await Promise.all([
                getAllTasks(),
                getWeeks(),
                getFirefighters()
            ]);
            setTasks(taskData);
            setWeeks(weekData);
            setFirefighters(firefighterData);
        } catch (error) {
            console.error("Error fetching tasks:", error);
            toast({
                title: "Error",
                description: "No se pudieron cargar las tareas.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const loggedInFirefighter = useMemo(() => {
        if (!user || firefighters.length === 0) return null;
        return firefighters.find(f => f.legajo === user.id) || null;
    }, [user, firefighters]);

    const weekMap = useMemo(() => new Map(weeks.map(w => [w.id, w])), [weeks]);

    const filteredTasks = useMemo(() => {
        if (!user) return [];
        
        return tasks
            .filter(task => task.status === 'Pendiente')
            .filter(task => {
                const week = weekMap.get(task.weekId);
                if (!week) return false;

                // Master y Oficiales ven todas las tareas pendientes
                if (activeRole === 'Master' || activeRole === 'Oficial') return true;

                if (!loggedInFirefighter) return false;

                // Administrador ve su propio cuartel
                if (activeRole === 'Administrador') {
                    return week.firehouse === loggedInFirefighter.firehouse;
                }

                // Encargado ve las tareas de sus semanas asignadas
                if (activeRole === 'Encargado') {
                    return week.leadId === loggedInFirefighter.id;
                }

                // Bombero ve tareas asignadas directamente
                if (activeRole === 'Bombero') {
                    return task.assignedToIds?.includes(loggedInFirefighter.id);
                }

                return false;
            })
            .map(task => ({
                ...task,
                weekName: weekMap.get(task.weekId)?.name || 'Semana desconocida',
                week: weekMap.get(task.weekId)
            }))
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }, [tasks, weekMap, loggedInFirefighter, user, activeRole]);

    const canUserManageTask = (task: any) => {
        if (!user || !loggedInFirefighter) return false;
        if (activeRole === 'Master') return true;
        
        const week = task.week;
        if (!week) return false;

        if (activeRole === 'Administrador') {
            return week.firehouse === loggedInFirefighter.firehouse;
        }

        if (activeRole === 'Encargado') {
            return week.leadId === loggedInFirefighter.id;
        }

        return false;
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            await deleteTask(taskId, user);
            toast({ title: "Tarea eliminada" });
            fetchData();
        } catch (error) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    return (
        <>
            <PageHeader title="Tareas Pendientes" description="Vista general de las actividades por realizar según tu rango y asignación." />
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Pendientes del Departamento</CardTitle>
                    <CardDescription>
                        {activeRole === 'Master' || activeRole === 'Oficial' 
                            ? `Visualizando todas las tareas pendientes de todos los cuarteles.` 
                            : `Visualizando tareas pendientes bajo tu responsabilidad o asignación.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tarea</TableHead>
                                <TableHead>Semana</TableHead>
                                <TableHead>Fecha Creación</TableHead>
                                <TableHead>Asignado a</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right"><span className="sr-only">Acciones</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredTasks.length > 0 ? (
                                filteredTasks.map(task => {
                                    const canManage = canUserManageTask(task);
                                    return (
                                        <TableRow key={task.id}>
                                            <TableCell className="font-medium">{task.title}</TableCell>
                                            <TableCell>{task.weekName}</TableCell>
                                            <TableCell className="text-xs">{task.createdAt ? format(parseISO(task.createdAt), 'P', { locale: es }) : 'N/A'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {task.assignedTo && task.assignedTo.length > 0 ? 
                                                        task.assignedTo.map(f => f ? <Badge key={f.id} variant="secondary" className="text-[10px]">{f.lastName}</Badge> : null) : 
                                                        <Badge variant="outline" className="text-[10px]">Sin asignar</Badge>
                                                    }
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn("text-[10px] font-bold uppercase", getStatusBadgeColor(task.status))}>{task.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {canManage && (
                                                    <AlertDialog>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                <EditTaskDialog week={task.week} task={task} onTaskUpdated={fetchData}>
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                                                    </DropdownMenuItem>
                                                                </EditTaskDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                                    </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta acción eliminará permanentemente la tarea "{task.title}".
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteTask(task.id)} variant="destructive">Eliminar</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                                        No se encontraron tareas pendientes bajo tu supervisión.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
