
'use client';

import { PageHeader } from "@/components/page-header";
import { useEffect, useState, useMemo } from "react";
import { Task, Week, Firefighter } from "@/lib/types";
import { getAllTasks } from "@/services/tasks.service";
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

    useEffect(() => {
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
        fetchData();
    }, [toast]);

    const filteredTasks = useMemo(() => {
        if (!user) return [];
        
        const firefighterProfile = firefighters.find(f => f.legajo === user.id);
        const weekMap = new Map(weeks.map(w => [w.id, w]));

        return tasks
            .filter(task => task.status === 'Pendiente')
            .filter(task => {
                const week = weekMap.get(task.weekId);
                if (!week) return false;

                // Master y Oficiales ven todas las tareas pendientes del departamento
                if (activeRole === 'Master' || activeRole === 'Oficial') return true;

                if (!firefighterProfile) return false;

                // Administrador ve todas las tareas de su propio cuartel
                if (activeRole === 'Administrador') {
                    return week.firehouse === firefighterProfile.firehouse;
                }

                // Encargado ve las tareas de las semanas donde él es el Lead
                if (activeRole === 'Encargado') {
                    return week.leadId === firefighterProfile.id;
                }

                // Bombero ve tareas asignadas directamente a él
                if (activeRole === 'Bombero') {
                    return task.assignedToIds?.includes(firefighterProfile.id);
                }

                return false;
            })
            .map(task => ({
                ...task,
                weekName: weekMap.get(task.weekId)?.name || 'Semana desconocida'
            }))
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }, [tasks, weeks, firefighters, user, activeRole]);

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
                                <TableHead className="text-right">Estado</TableHead>
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
                                        <TableCell className="text-right"><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredTasks.length > 0 ? (
                                filteredTasks.map(task => (
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
                                        <TableCell className="text-right">
                                            <Badge className={cn("text-[10px] font-bold uppercase", getStatusBadgeColor(task.status))}>{task.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
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
