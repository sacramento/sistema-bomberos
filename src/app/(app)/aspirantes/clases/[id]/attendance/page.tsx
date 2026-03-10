
'use client';
import React from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Eye, Edit, UserCheck, UserX, Clock, ShieldAlert, Save, UserCog } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Firefighter, Session, AttendanceStatus } from "@/lib/types";
import { getAspiranteSessionById, updateAspiranteSessionAttendance } from "@/services/aspirantes-sessions.service";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';


const statusOptions: { value: AttendanceStatus; label: string }[] = [
    { value: "present", label: "Presente" },
    { value: "recupero", label: "Recuperó" },
    { value: "absent", label: "Ausente" },
    { value: "tardy", label: "Tarde" },
    { value: "excused", label: "Justificado" },
];

const getStatusClass = (status: AttendanceStatus) => {
    switch (status) {
        case "present": return "bg-green-600 hover:bg-green-700 text-white border-green-600 focus:ring-green-500";
        case "absent": return "bg-red-600 hover:bg-red-700 text-white border-red-600 focus:ring-red-500";
        case "tardy": return "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500 focus:ring-yellow-500";
        case "excused": return "bg-violet-600 hover:bg-violet-700 text-white border-violet-600 focus:ring-violet-500";
        case "recupero": return "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 focus:ring-blue-500";
        default: return "";
    }
}

const getStatusLabel = (status: AttendanceStatus) => {
    return statusOptions.find(o => o.value === status)?.label || "N/A";
}


export default function AspiranteClassAttendancePage() {
    const params = useParams();
    const pathname = usePathname();
    const sessionId = params.id as string;
    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    
    const [session, setSession] = useState<Session | null>(null);
    const [allParticipants, setAllParticipants] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    
    const instructorIds = useMemo(() => new Set(session?.instructors.map(i => i.id)), [session]);
    const assistantIds = useMemo(() => new Set(session?.assistants.map(a => a.id)), [session]);
    
    const activeRole = getActiveRole(pathname);
    const canEdit = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Instructor', [activeRole]);

    useEffect(() => {
        const fetchSession = async () => {
            if (sessionId) {
                setLoading(true);
                try {
                    const data = await getAspiranteSessionById(sessionId);
                    setSession(data);
                    if (data) {
                        const uniqueParticipants = new Map<string, Firefighter>();
                        [...data.instructors, ...data.assistants, ...data.attendees].forEach(p => {
                            if (p.status === 'Active') {
                                uniqueParticipants.set(p.id, p);
                            }
                        });
                        const participants = Array.from(uniqueParticipants.values());
                        setAllParticipants(participants);

                        if (data.attendance && Object.keys(data.attendance).length > 0) {
                            setAttendance(data.attendance);
                        } else {
                            // If no attendance is saved, create a default one
                            const initialAttendance: Record<string, AttendanceStatus> = {};
                            participants.forEach(p => {
                                initialAttendance[p.id] = 'present';
                            });
                            setAttendance(initialAttendance);
                        }
                    }
                } catch (error) {
                    toast({
                        title: "Error",
                        description: "No se pudo cargar la clase.",
                        variant: "destructive"
                    });
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchSession();
    }, [sessionId, toast]);

    const groupedAttendees = useMemo(() => {
        if (!allParticipants) return [];
        // For aspirantes, we don't need to group by firehouse
        const aspirantes = allParticipants.filter(a => a.rank === 'ASPIRANTE').sort((a,b) => (a.legajo || '').localeCompare(b.legajo || ''));
        const instructorsAndAssistants = allParticipants.filter(a => a.rank !== 'ASPIRANTE').sort((a,b) => (a.legajo || '').localeCompare(b.legajo || ''));

        const groups = [];
        if (instructorsAndAssistants.length > 0) groups.push({ title: 'INSTRUCTORES Y AYUDANTES', firefighters: instructorsAndAssistants });
        if (aspirantes.length > 0) groups.push({ title: 'ASPIRANTES', firefighters: aspirantes });

        return groups;
    }, [allParticipants]);


    const summary = useMemo(() => {
        if (!allParticipants) return { present: 0, absent: 0, tardy: 0, excused: 0, recupero: 0, total: 0 };
        const total = allParticipants.length;
        const present = Object.values(attendance).filter(s => s === 'present').length;
        const absent = Object.values(attendance).filter(s => s === 'absent').length;
        const tardy = Object.values(attendance).filter(s => s === 'tardy').length;
        const excused = Object.values(attendance).filter(s => s === 'excused').length;
        const recupero = Object.values(attendance).filter(s => s === 'recupero').length;
        return { present, absent, tardy, excused, recupero, total };
    }, [attendance, allParticipants]);

    if (loading) {
         return (
             <>
                <PageHeader title="..." description="...">
                    <Skeleton className="h-10 w-32" />
                </PageHeader>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index}>
                             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-12 mb-1" />
                                <Skeleton className="h-4 w-28" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-40 w-full" />
                    </CardContent>
                 </Card>
             </>
         )
    }

    if (!session) {
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <PageHeader title="Clase No Encontrada" />
            <p>No se pudo encontrar la clase solicitada.</p>
          </div>
        )
    }
    
    const handleStatusChange = (firefighterId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({...prev, [firefighterId]: status}));
    }

    const handleSaveChanges = async () => {
        setSaving(true);
        try {
            if (!user) throw new Error("Usuario no autenticado");
            await updateAspiranteSessionAttendance(sessionId, attendance, user);
            toast({
                title: "¡Éxito!",
                description: "La asistencia ha sido guardada correctamente."
            });
        } catch (error) {
             toast({
                title: "Error",
                description: "No se pudo guardar la asistencia.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const summaryCards = [
        { title: "Presentes", value: summary.present + summary.recupero, icon: UserCheck, color: "text-green-500" },
        { title: "Ausentes", value: summary.absent, icon: UserX, color: "text-red-500" },
        { title: "Tardes", value: summary.tardy, icon: Clock, color: "text-yellow-500" },
        { title: "Justificados", value: summary.excused, icon: ShieldAlert, color: "text-violet-500" },
    ];
    
    const renderFirefighterName = (firefighter: Firefighter) => {
        const isInstructor = instructorIds.has(firefighter.id);
        const isAssistant = assistantIds.has(firefighter.id);

        return (
            <div className="flex items-center gap-2">
                <span>{`${firefighter.legajo} - ${firefighter.lastName}, ${firefighter.firstName}`}</span>
                {isInstructor && <Badge variant="destructive">I</Badge>}
                {isAssistant && <Badge variant="secondary">A</Badge>}
            </div>
        );
    }
    
    const renderTableBody = (isSummaryView: boolean) => (
         <TableBody>
            {groupedAttendees.map(group => (
                <React.Fragment key={group.title}>
                    <TableRow className="bg-muted hover:bg-muted">
                        <TableCell colSpan={isSummaryView ? 2 : 2} className="font-bold text-muted-foreground text-center tracking-wider">
                           --- {group.title} ---
                        </TableCell>
                    </TableRow>
                    {group.firefighters.map(firefighter => (
                        <TableRow key={firefighter.id}>
                            <TableCell className="font-medium">
                                <div>{renderFirefighterName(firefighter)}</div>
                            </TableCell>
                            {isSummaryView && (
                                <TableCell>
                                    <Badge className={cn("whitespace-nowrap", getStatusClass(attendance[firefighter.id]))}>
                                        {getStatusLabel(attendance[firefighter.id])}
                                    </Badge>
                                </TableCell>
                            )}
                            {!isSummaryView && (
                                <TableCell className="text-right">
                                        <Select 
                                        value={attendance[firefighter.id]} 
                                        onValueChange={(status) => handleStatusChange(firefighter.id, status as AttendanceStatus)}
                                        disabled={!canEdit}
                                    >
                                        <SelectTrigger className={cn("w-[140px] ml-auto", getStatusClass(attendance[firefighter.id]))}>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </React.Fragment>
            ))}
        </TableBody>
    );
    
    const formattedDate = format(parseISO(session.date), "dd 'de' MMMM 'de' yyyy", { locale: es });

    return (
        <>
            <PageHeader title={`Asistencia: ${session.title}`} description={`Clase del ${formattedDate} a las ${session.startTime}hs.`}>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                </Button>
            </PageHeader>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                 {summaryCards.map((card, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                             <card.icon className={cn("h-4 w-4 text-muted-foreground", card.color)} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                            <p className="text-xs text-muted-foreground">de {summary.total} participantes</p>
                        </CardContent>
                    </Card>
                 ))}
            </div>

            <Tabs defaultValue={canEdit ? "register" : "view"} className="w-full">
                <TabsList className={cn("grid w-full mb-4", canEdit ? "grid-cols-2 max-w-md mx-auto" : "grid-cols-1 max-w-[200px] mx-auto")}>
                    {canEdit && <TabsTrigger value="register"><Edit className="mr-2 h-4 w-4"/>Registrar Asistencia</TabsTrigger>}
                    <TabsTrigger value="view"><Eye className="mr-2 h-4 w-4"/>Ver Resumen</TabsTrigger>
                </TabsList>
                
                {canEdit && (
                    <TabsContent value="register">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Lista de Participantes</CardTitle>
                                <CardDescription>Seleccione el estado de cada aspirante, instructor y ayudante.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Legajo y Nombre</TableHead>
                                                <TableHead className="text-right">Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        {renderTableBody(false)}
                                    </Table>
                                </div>
                            </CardContent>
                            <CardFooter className="justify-end">
                                <Button onClick={handleSaveChanges} disabled={saving}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                )}
                
                <TabsContent value="view">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Resumen de Asistencia</CardTitle>
                            <CardDescription>Resumen de la asistencia registrada para esta clase.</CardDescription>
                        </CardHeader>
                        <CardContent>
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Legajo y Nombre</TableHead>
                                            <TableHead>Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    {renderTableBody(true)}
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
    );
}
