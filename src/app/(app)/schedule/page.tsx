
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
        // Sort by most recent date first
        return [...sessions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sessions]);

    const renderSessionCards = () => {
        if (loading) {
            return (
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index} className="shadow-md">
                            <div className="p-4">
                                <Skeleton className="h-5 w-24 mb-2" />
                                <Skeleton className="h-7 w-4/5" />
                                <Skeleton className="h-5 w-32 mt-2" />
                            </div>
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
             <div className="space-y-4">
                {sortedSessions.map(session => {
                    const firehouseInfo = getMajorityFirehouseInfo(session);
                    return (
                        <Card key={session.id} className={cn("border-l-4 shadow-md", firehouseInfo.className)}>
                           <div className="grid grid-cols-1 sm:grid-cols-4 items-center p-4 gap-4">
                                <div className="sm:col-span-2">
                                     <div className="flex items-center gap-2 mb-2">
                                         <Badge variant="secondary">{session.specialization}</Badge>
                                         <span className="text-sm font-medium text-muted-foreground">{firehouseInfo.name}</span>
                                     </div>
                                     <h3 className="font-headline text-lg font-semibold">{session.title}</h3>
                                </div>
                                <div className="sm:col-span-2 sm:text-right">
                                     <p className="font-medium text-muted-foreground">
                                        {format(new Date(session.date), "dd/MM/yyyy", { locale: es })} a las {session.startTime}hs
                                    </p>
                                </div>
                           </div>
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
                description="Vista de todas las clases de capacitación planificadas, ordenadas de más reciente a más antigua."
            />
            {renderSessionCards()}
        </>
    );
}
