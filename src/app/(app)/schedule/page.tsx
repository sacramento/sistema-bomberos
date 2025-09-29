
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@/lib/types";
import { getSessions } from "@/services/sessions.service";
import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const getMajorityFirehouseInfo = (session: Session): { name: string, className: string } => {
    if (!session.attendees || session.attendees.length === 0) return { name: 'N/A', className: 'border-gray-500' };
    
    const firehouseCounts = session.attendees.reduce((acc, attendee) => {
        acc[attendee.firehouse] = (acc[attendee.firehouse] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    let majorityFirehouse = 'N/A';
    let maxCount = 0;

    for(const firehouse in firehouseCounts) {
        if(firehouseCounts[firehouse] > maxCount) {
            maxCount = firehouseCounts[firehouse];
            majorityFirehouse = firehouse;
        }
    }
    
    const colorMap: Record<string, string> = {
        'Cuartel 1': 'border-yellow-500',
        'Cuartel 2': 'border-blue-500',
        'Cuartel 3': 'border-orange-500',
    };

    return { name: majorityFirehouse, className: colorMap[majorityFirehouse] || 'border-gray-500' };
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

    const renderSessionCards = () => {
        if (loading) {
            return (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <Card key={index}>
                            <CardHeader>
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-4 w-32" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-7 w-4/5" />
                                <Skeleton className="h-5 w-full mt-2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            );
        }

        if (sortedSessions.length === 0) {
            return (
                <div className="text-center py-16 text-muted-foreground">
                    <p>No hay clases programadas.</p>
                </div>
            );
        }

        return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedSessions.map(session => {
                    const firehouseInfo = getMajorityFirehouseInfo(session);
                    return (
                        <Card key={session.id} className={cn("flex flex-col border-l-4", firehouseInfo.className)}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <Badge variant="secondary">{session.specialization}</Badge>
                                    <span className="text-sm font-medium text-muted-foreground">{firehouseInfo.name}</span>
                                </div>
                                <CardTitle className="font-headline text-lg pt-2">{session.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="mt-auto">
                                <p className="text-sm text-muted-foreground">
                                    {format(new Date(session.date), 'dd/MM/yyyy', { locale: es })} a las {session.startTime}hs
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        );
    }

    return (
        <>
            <PageHeader
                title="Cronograma de Capacitaciones"
                description="Vista de todas las clases de capacitación planificadas, coloreadas por cuartel principal."
            />
            {renderSessionCards()}
        </>
    );
}
