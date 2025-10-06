
'use client';

import { useAuth } from "@/context/auth-context";
import { Task, Week } from "@/lib/types";
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ClipboardCheck, ClipboardX } from "lucide-react";
import Link from "next/link";

const getStatusBadgeColor = (status: Task['status']) => {
    switch (status) {
        case 'Pendiente': return 'bg-yellow-500 text-black hover:bg-yellow-500/90';
        case 'Completada': return 'bg-green-600 hover:bg-green-600/90';
        default: return '';
    }
};

export default function MyTasks({ allTasks, allWeeks }: { allTasks: Task[]; allWeeks: Week[] }) {
    const { user } = useAuth();

    const myTasks = useMemo(() => {
        if (!user) return [];
        return allTasks
            .filter(task => task.assignedTo?.some(assignee => assignee.legajo === user.id))
            .map(task => ({
                ...task,
                weekName: allWeeks.find(w => w.id === task.weekId)?.name || 'Semana desconocida'
            }))
            .sort((a, b) => {
                // Sort by status: Pendiente > Completada
                const statusOrder = { 'Pendiente': 1, 'Completada': 2 };
                return statusOrder[a.status] - statusOrder[b.status];
            });
    }, [user, allTasks, allWeeks]);

    if (!user || (user.role !== 'Bombero' && user.role !== 'Ayudantía' && user.role !== 'Oficial')) {
        // Only show this component for specific roles or if they have tasks
        if(myTasks.length === 0) return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Mis Tareas Pendientes</CardTitle>
                <CardDescription>Un resumen de todas las tareas que tienes asignadas.</CardDescription>
            </CardHeader>
            <CardContent>
                {myTasks.length > 0 ? (
                    <ul className="space-y-4">
                        {myTasks.map(task => (
                            <li key={task.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4">
                                <div className="flex-grow">
                                    <p className="text-sm text-muted-foreground">{task.weekName}</p>
                                    <Link href={`/weeks/${task.weekId}`}>
                                        <h4 className="font-semibold hover:underline">{task.title}</h4>
                                    </Link>
                                </div>
                                <Badge className={cn("w-fit", getStatusBadgeColor(task.status))}>{task.status}</Badge>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center h-40 border-2 border-dashed rounded-lg">
                        <ClipboardCheck className="h-10 w-10 text-green-500 mb-2"/>
                        <p className="font-semibold">¡Todo en orden!</p>
                        <p className="text-muted-foreground">No tienes tareas pendientes asignadas.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

    