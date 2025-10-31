
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

    const ranks = new Set(attendees.map(a => a.rank));
    const firehouses = new Set(attendees.map(a => a.firehouse));

    // Case 1: Only Aspirantes
    if (ranks.size === 1 && ranks.has('ASPIRANTE')) {
        return { name: 'Aspirantes', className: 'border-green-500' };
    }

    // Case 2: Only Officers/Sub-officers
    const suboficialRanks = ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR'];
    const oficialRanks = ['OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'];
    const allOfficerRanks = new Set([...suboficialRanks, ...oficialRanks]);
    const isOnlyOfficers = attendees.every(a => allOfficerRanks.has(a.rank));
    if (isOnlyOfficers) {
        return { name: 'Oficiales', className: 'border-red-500' };
    }
    
    // Case 3: Homogenous firehouse group
    const isSingleFirehouse = firehouses.size === 1;
    if (isSingleFirehouse) {
        const firehouse = firehouses.values().next().value;
        switch(firehouse) {
            case 'Cuartel 1': return { name: 'Cuartel 1', className: 'border-yellow-500' };
            case 'Cuartel 2': return { name: 'Cuartel 2', className: 'border-blue-500' };
            case 'Cuartel 3': return { name: 'Cuartel 3', className: 'border-green-500' };
        }
    }
    
    // Default/Fallback: Mixed group
    return { name: 'Varios Cuarteles', className: 'border-gray-500' };
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
