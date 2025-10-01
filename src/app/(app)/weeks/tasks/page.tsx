
'use client';

import { PageHeader } from "@/components/page-header";
import { useEffect, useState, useMemo } from "react";
import { Task, Week } from "@/lib/types";
import { getAllTasks } from "@/services/tasks.service";
import { getWeeks } from "@/services/weeks.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const getStatusBadgeColor = (status: Task['status']) => {
    switch (status) {
        case 'Pendiente': return 'bg-yellow-500 text-black';
        case 'En Progreso': return 'bg-blue-500';
        case 'Completada': return 'bg-green-600';
        default: return '';
    }
};

export default function AllTasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [taskData, weekData] = await Promise.all([
                    getAllTasks(),
                    getWeeks()
                ]);
                setTasks(taskData);
                setWeeks(weekData);
            } catch (error) {
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

    const enrichedTasks = useMemo(() => {
        const weekMap = new Map(weeks.map(w => [w.id, w.name]));
        return tasks.map(task => ({
            ...task,
            weekName: weekMap.get(task.weekId) || 'Semana desconocida'
        })).sort((a,b) => (a.weekName.localeCompare(b.weekName) || a.title.localeCompare(b.title)));
    }, [tasks, weeks]);

    return (
        <>
            <PageHeader title="Listado General de Tareas" description="Vista de solo lectura de todas las tareas asignadas en todas las semanas." />
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Todas las Tareas</CardTitle>
                    <CardDescription>Mostrando {enrichedTasks.length} tareas en total.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tarea</TableHead>
                                <TableHead>Semana</TableHead>
                                <TableHead>Asignado a</TableHead>
                                <TableHead className="text-right">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 10 }).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-56" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : enrichedTasks.length > 0 ? (
                                enrichedTasks.map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">{task.title}</TableCell>
                                        <TableCell>{task.weekName}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {task.assignedTo && task.assignedTo.length > 0 ? 
                                                    task.assignedTo.map(f => <Badge key={f.id} variant="secondary">{f.lastName}</Badge>) : 
                                                    <Badge variant="outline">Nadie</Badge>
                                                }
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge className={cn(getStatusBadgeColor(task.status))}>{task.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No hay tareas registradas en el sistema.
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
