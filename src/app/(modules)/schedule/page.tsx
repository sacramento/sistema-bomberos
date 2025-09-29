
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@/lib/types";
import { getSessions } from "@/services/sessions.service";
import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";

const getMajorityFirehouse = (session: Session): string => {
    if (!session.attendees || session.attendees.length === 0) return 'N/A';
    
    const firehouseCounts = session.attendees.reduce((acc, attendee) => {
        acc[attendee.firehouse] = (acc[attendee.firehouse] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const majorityFirehouse = Object.keys(firehouseCounts).reduce((a, b) => firehouseCounts[a] > firehouseCounts[b] ? a : b, '');

    return majorityFirehouse || 'N/A';
};

export default function SchedulePage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchSessions = async () => {
            setLoading(true);
            try {
                const data = await getSessions();
                setSessions(data);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "No se pudo cargar el cronograma de clases.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };
        fetchSessions();
    }, [toast]);
    
    const sortedSessions = useMemo(() => {
        return [...sessions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [sessions]);


    return (
        <>
            <PageHeader
                title="Cronograma de Capacitaciones"
                description="Vista de solo lectura de todas las clases de capacitación planificadas."
            />
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Todas las Clases</CardTitle>
                    <CardDescription>
                        Una lista completa de todas las capacitaciones, ordenadas por fecha.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Capacitación</TableHead>
                                <TableHead>Especialidad</TableHead>
                                <TableHead>Cuartel Principal</TableHead>
                                <TableHead>Fecha y Hora</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                sortedSessions.map(session => (
                                    <TableRow key={session.id}>
                                        <TableCell className="font-medium">{session.title}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{session.specialization}</Badge>
                                        </TableCell>
                                        <TableCell>{getMajorityFirehouse(session)}</TableCell>
                                        <TableCell>{session.date} @ {session.startTime}hs</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {sessions.length === 0 && !loading && (
                        <div className="text-center py-16 text-muted-foreground">
                            <p>No hay clases programadas.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
