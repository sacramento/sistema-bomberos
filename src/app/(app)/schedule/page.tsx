
'use client';

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Session, Firefighter } from "@/lib/types";
import { getSessions } from "@/services/sessions.service";
import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const getMajorityGroupInfo = (session: Session): { name: string, className: string } => {
    const attendees = session.attendees;
    if (!attendees || attendees.length === 0) return { name: 'N/A', className: 'border-gray-500' };

    const totalAttendees = attendees.length;
    const suboficialRanks = ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR'];
    const oficialRanks = ['OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'];

    // Prioridad 1: Aspirantes
    const aspirantesCount = attendees.filter(a => a.rank === 'ASPIRANTE').length;
    if (aspirantesCount / totalAttendees > 0.8) return { name: 'Aspirantes', className: 'border-green-500' };

    // Prioridad 2: Jerarquía de Oficiales y Suboficiales
    const suboficialesOficialesCount = attendees.filter(a => [...suboficialRanks, ...oficialRanks].includes(a.rank)).length;
    if (suboficialesOficialesCount / totalAttendees > 0.8) return { name: 'Oficiales', className: 'border-red-500' };

    // Prioridad 3: Conteo por Cuartel
    const firehouseCounts: Record<string, number> = { 'Cuartel 1': 0, 'Cuartel 2': 0, 'Cuartel 3': 0 };
    attendees.forEach(a => {
        if (firehouseCounts.hasOwnProperty(a.firehouse)) {
            firehouseCounts[a.firehouse]++;
        }
    });

    const hasC1 = firehouseCounts['Cuartel 1'] > 0;
    const hasC2 = firehouseCounts['Cuartel 2'] > 0;
    const hasC3 = firehouseCounts['Cuartel 3'] > 0;
    const distinctFirehouses = [hasC1, hasC2, hasC3].filter(Boolean).length;

    if (distinctFirehouses > 1) {
        return { name: 'Varios Cuarteles', className: 'border-gray-500' };
    }

    // Prioridad 4: Mayoría de Cuartel
    if (firehouseCounts['Cuartel 1'] / totalAttendees > 0.6) return { name: 'Cuartel 1', className: 'border-yellow-500' };
    if (firehouseCounts['Cuartel 2'] / totalAttendees > 0.6) return { name: 'Cuartel 2', className: 'border-blue-500' };
    if (firehouseCounts['Cuartel 3'] / totalAttendees > 0.6) return { name: 'Cuartel 3', className: 'border-green-500' };

    // Último Recurso
    return { name: 'General', className: 'border-gray-500' };
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
        return [...sessions].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
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
                    const groupInfo = getMajorityGroupInfo(session);
                    const sessionDate = parseISO(session.date);
                    return (
                        <Card key={session.id} className={cn("border-l-4 shadow-md", groupInfo.className)}>
                           <div className="grid grid-cols-1 sm:grid-cols-4 items-center p-4 gap-4">
                                <div className="sm:col-span-2">
                                     <div className="flex items-center gap-2 mb-2">
                                         <Badge variant="secondary">{session.specialization}</Badge>
                                         <span className="text-sm font-medium text-muted-foreground">{groupInfo.name}</span>
                                     </div>
                                     <h3 className="font-headline text-lg font-semibold">{session.title}</h3>
                                </div>
                                <div className="sm:col-span-2 sm:text-right">
                                     <p className="font-medium text-muted-foreground">
                                        {format(sessionDate, "EEEE, dd 'de' MMMM", { locale: es })} a las {session.startTime}hs
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
