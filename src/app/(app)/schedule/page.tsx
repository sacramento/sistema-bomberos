
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Session, Firefighter } from "@/lib/types";
import { getSessions } from "@/services/sessions.service";
import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Calendar, Clock } from "lucide-react";

const getMajorityGroupInfo = (session: Session): { name: string, className: string, bgClassName: string } => {
    const attendees = session.attendees;
    if (!attendees || attendees.length === 0) return { name: 'N/A', className: 'border-gray-500', bgClassName: 'bg-gray-500/10' };

    const totalAttendees = attendees.length;
    
    // Jerarquías
    const suboficialRanks = ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR'];
    const oficialRanks = ['OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'];
    const officerAndSubOfficerRanks = new Set([...suboficialRanks, ...oficialRanks]);
    
    const aspirantesCount = attendees.filter(a => a.rank === 'ASPIRANTE').length;
    const officersCount = attendees.filter(a => officerAndSubOfficerRanks.has(a.rank)).length;

    // Cuarteles
    const firehouseCounts: Record<string, number> = { 'Cuartel 1': 0, 'Cuartel 2': 0, 'Cuartel 3': 0 };
    attendees.forEach(a => {
        if (firehouseCounts.hasOwnProperty(a.firehouse)) {
            firehouseCounts[a.firehouse]++;
        }
    });

    // Prioridad 1: Aspirantes (si son la gran mayoría)
    if (aspirantesCount / totalAttendees > 0.8) {
        return { name: 'Aspirantes', className: 'border-green-500', bgClassName: 'bg-green-500/10' };
    }

    // Prioridad 2: Oficiales y Suboficiales (si son la gran mayoría)
    if (officersCount / totalAttendees > 0.8) {
        return { name: 'Oficiales', className: 'border-red-500', bgClassName: 'bg-red-500/10' };
    }

    // Prioridad 3: Mayoría de un cuartel específico
    if (firehouseCounts['Cuartel 1'] / totalAttendees > 0.6) {
        return { name: 'Cuartel 1', className: 'border-yellow-500', bgClassName: 'bg-yellow-500/10' };
    }
    if (firehouseCounts['Cuartel 2'] / totalAttendees > 0.6) {
        return { name: 'Cuartel 2', className: 'border-blue-500', bgClassName: 'bg-blue-500/10' };
    }
    if (firehouseCounts['Cuartel 3'] / totalAttendees > 0.6) {
        return { name: 'Cuartel 3', className: 'border-orange-500', bgClassName: 'bg-orange-500/10' }; // Changed to orange for better differentiation
    }

    // Fallback: Grupo Mixto
    return { name: 'Varios Cuarteles', className: 'border-gray-500', bgClassName: 'bg-gray-500/10' };
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
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Card key={index} className="shadow-md">
                            <CardHeader>
                                <Skeleton className="h-5 w-24 mb-2" />
                                <Skeleton className="h-7 w-4/5" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-5 w-full mt-2" />
                                <Skeleton className="h-5 w-3/4 mt-2" />
                            </CardContent>
                            <CardFooter>
                                <Skeleton className="h-5 w-1/2 mt-2" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            );
        }

        if (sortedSessions.length === 0) {
            return (
                <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>No hay clases programadas.</p>
                </div>
            );
        }

        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sortedSessions.map(session => {
                    const groupInfo = getMajorityGroupInfo(session);
                    const sessionDate = parseISO(session.date);
                    return (
                        <Card key={session.id} className={cn("flex flex-col border-l-4 shadow-md hover:shadow-lg transition-shadow", groupInfo.className, groupInfo.bgClassName)}>
                           <CardHeader>
                                <div className="flex items-center gap-2 mb-2">
                                     <Badge variant="secondary">{session.specialization}</Badge>
                                     <Badge variant="outline">{groupInfo.name}</Badge>
                                </div>
                                <CardTitle className="font-headline text-lg">{session.title}</CardTitle>
                           </CardHeader>
                           <CardContent className="flex-grow">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Calendar className="h-4 w-4" />
                                    <span>{format(sessionDate, "EEEE, dd 'de' MMMM", { locale: es })}</span>
                                </div>
                                 <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{session.startTime}hs</span>
                                </div>
                           </CardContent>
                           <CardFooter>
                                <p className="text-xs text-muted-foreground">
                                    Instructores: {session.instructors.map(i => i.lastName).join(', ')}
                                </p>
                           </CardFooter>
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
