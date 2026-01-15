
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Session, Firefighter, Specialization } from "@/lib/types";
import { getSessions } from "@/services/sessions.service";
import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Calendar, Clock, Flame } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const getMajorityGroupInfo = (session: Session): { name: string, className: string, bgClassName: string, firehouse: 'Cuartel 1' | 'Cuartel 2' | 'Cuartel 3' | 'Varios' | 'Suboficiales' } => {
    const attendees = session.attendees;
    if (!attendees || attendees.length === 0) return { name: 'N/A', className: 'border-gray-500', bgClassName: 'bg-gray-500/5', firehouse: 'Varios' };

    const totalAttendees = attendees.length;
    
    const suboficialRanks = ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR'];
    const oficialRanks = ['OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'];
    const officerAndSubOfficerRanks = new Set([...suboficialRanks, ...oficialRanks]);
    
    const aspirantesCount = attendees.filter(a => a.rank === 'ASPIRANTE').length;
    const officersCount = attendees.filter(a => officerAndSubOfficerRanks.has(a.rank)).length;

    const firehouseCounts: Record<string, number> = { 'Cuartel 1': 0, 'Cuartel 2': 0, 'Cuartel 3': 0 };
    attendees.forEach(a => {
        if (firehouseCounts.hasOwnProperty(a.firehouse)) {
            firehouseCounts[a.firehouse]++;
        }
    });

    if (aspirantesCount / totalAttendees > 0.8) {
        return { name: 'Aspirantes', className: 'border-green-500', bgClassName: 'bg-green-500/5', firehouse: 'Varios' }; // Aspirantes are general
    }

    if (officersCount / totalAttendees > 0.8) {
        return { name: 'Suboficiales', className: 'border-red-500', bgClassName: 'bg-red-500/5', firehouse: 'Suboficiales' };
    }

    if (firehouseCounts['Cuartel 1'] / totalAttendees > 0.6) {
        return { name: 'Cuartel 1', className: 'border-yellow-500', bgClassName: 'bg-yellow-500/5', firehouse: 'Cuartel 1' };
    }
    if (firehouseCounts['Cuartel 2'] / totalAttendees > 0.6) {
        return { name: 'Cuartel 2', className: 'border-blue-500', bgClassName: 'bg-blue-500/5', firehouse: 'Cuartel 2' };
    }
    if (firehouseCounts['Cuartel 3'] / totalAttendees > 0.6) {
        return { name: 'Cuartel 3', className: 'border-orange-500', bgClassName: 'bg-orange-500/5', firehouse: 'Cuartel 3' };
    }

    return { name: 'Varios Cuarteles', className: 'border-gray-500', bgClassName: 'bg-gray-500/5', firehouse: 'Varios' };
};

const getGroupBadgeClass = (groupName: string): string => {
    switch (groupName) {
        case 'Aspirantes': return 'bg-green-600/80 text-white border-green-700';
        case 'Suboficiales': return 'bg-red-600/80 text-white border-red-700';
        case 'Cuartel 1': return 'bg-yellow-500/80 text-black border-yellow-600';
        case 'Cuartel 2': return 'bg-blue-500/80 text-white border-blue-600';
        case 'Cuartel 3': return 'bg-orange-500/80 text-white border-orange-600';
        default: return 'bg-gray-500/80 text-white border-gray-600';
    }
};


export default function SchedulePage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

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
    
    const availableYears = useMemo(() => {
        if (sessions.length === 0) return [new Date().getFullYear().toString()];
        const years = new Set(sessions.map(s => parseISO(s.date).getFullYear().toString()));
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [sessions]);

    const filteredSessions = useMemo(() => {
        if (selectedYear === 'all') return sessions;
        return sessions.filter(session => parseISO(session.date).getFullYear().toString() === selectedYear);
    }, [sessions, selectedYear]);

    const summaryData = useMemo(() => {
        type SummaryStructure = Record<'Cuartel 1' | 'Cuartel 2' | 'Cuartel 3' | 'Suboficiales', Record<Specialization, number>>;

        const summary: SummaryStructure = {
            'Cuartel 1': {} as Record<Specialization, number>,
            'Cuartel 2': {} as Record<Specialization, number>,
            'Cuartel 3': {} as Record<Specialization, number>,
            'Suboficiales': {} as Record<Specialization, number>,
        };

        filteredSessions.forEach(session => {
            const { firehouse } = getMajorityGroupInfo(session);
            const spec = session.specialization;

            if (firehouse === 'Varios') {
                // If it's a general class, count it for all 3 main cuarteles
                summary['Cuartel 1'][spec] = (summary['Cuartel 1'][spec] || 0) + 1;
                summary['Cuartel 2'][spec] = (summary['Cuartel 2'][spec] || 0) + 1;
                summary['Cuartel 3'][spec] = (summary['Cuartel 3'][spec] || 0) + 1;
            } else if (summary.hasOwnProperty(firehouse)) {
                // If it belongs to a specific group (C1, C2, C3, or Suboficiales), count it there
                summary[firehouse as keyof SummaryStructure][spec] = (summary[firehouse as keyof SummaryStructure][spec] || 0) + 1;
            }
        });
        
        return summary;
    }, [filteredSessions]);
    
    const groupedSessions = useMemo(() => {
        if (filteredSessions.length === 0) return {};

        const sorted = [...filteredSessions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        
        return sorted.reduce((acc, session) => {
            const monthYearKey = format(parseISO(session.date), 'MMMM yyyy', { locale: es });
            const capitalizedKey = monthYearKey.charAt(0).toUpperCase() + monthYearKey.slice(1);

            if (!acc[capitalizedKey]) {
                acc[capitalizedKey] = [];
            }
            acc[capitalizedKey].push(session);
            return acc;
        }, {} as Record<string, Session[]>);

    }, [filteredSessions]);

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

        if (Object.keys(groupedSessions).length === 0) {
            return (
                <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>No hay clases programadas para el año seleccionado.</p>
                </div>
            );
        }

        return (
             <div className="space-y-12">
                {Object.entries(groupedSessions).map(([monthYear, monthSessions]) => (
                    <section key={monthYear}>
                        <h2 className="font-headline text-2xl font-semibold tracking-tight border-b pb-2 mb-6">{monthYear}</h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {monthSessions.map(session => {
                                const groupInfo = getMajorityGroupInfo(session);
                                const sessionDate = parseISO(session.date);
                                return (
                                    <Card key={session.id} className={cn("flex flex-col border-l-4 shadow-md hover:shadow-lg transition-shadow", groupInfo.className, groupInfo.bgClassName)}>
                                       <CardHeader>
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                 <Badge variant="default">{session.specialization}</Badge>
                                                 <Badge className={cn(getGroupBadgeClass(groupInfo.name))}>{groupInfo.name}</Badge>
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
                                                Instructores: {session.instructors.map(i => i.legajo).join(', ')}
                                            </p>
                                       </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        );
    }

    return (
        <>
            <PageHeader
                title="Cronograma de Capacitaciones"
                description="Vista de todas las clases de capacitación planificadas."
            >
                <div className="space-y-2">
                    <Label htmlFor="year-select">Ciclo Lectivo</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger id="year-select" className="w-[180px]">
                            <SelectValue placeholder="Seleccionar año..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {availableYears.map(year => (
                                <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </PageHeader>
            
            <div className="space-y-8 mb-8">
                <h2 className="font-headline text-2xl font-semibold tracking-tight">Clases por Grupo ({selectedYear === 'all' ? 'Todos los años' : `Año ${selectedYear}`})</h2>
                {(['Cuartel 1', 'Cuartel 2', 'Cuartel 3', 'Suboficiales'] as const).map(groupName => (
                    <Card key={groupName}>
                        <CardHeader>
                            <CardTitle className="font-headline text-lg">{groupName}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-20 w-full" /> : 
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {Object.keys(summaryData[groupName]).length > 0 ? (
                                    Object.entries(summaryData[groupName])
                                        .sort(([specA], [specB]) => specA.localeCompare(specB))
                                        .map(([spec, count]) => (
                                        <div key={spec} className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50 text-center">
                                            <p className="text-3xl font-bold text-primary">{count}</p>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{spec}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-sm col-span-full">Sin clases registradas para este grupo en el período seleccionado.</p>
                                )}
                            </div>
                            }
                        </CardContent>
                    </Card>
                ))}
            </div>

            {renderSessionCards()}
        </>
    );
}
