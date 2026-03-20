
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
import { getAspiranteWorkshopById, updateAspiranteWorkshopAttendance } from "@/services/aspirantes-workshops.service";
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


export default function AspiranteWorkshopAttendancePage() {
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
    
    const activeRole = getActiveRole(pathname);
    const canEdit = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Instructor', [activeRole]);

    useEffect(() => {
        const fetchSession = async () => {
            if (sessionId) {
                setLoading(true);
                try {
                    const data = await getAspiranteWorkshopById(sessionId);
                    setSession(data);
                    if (data) {
                        // Filtrar SOLO aspirantes para el listado de alumnos
                        // Ordenamos por legajo numérico
                        const aspirantes = data.attendees
                            .filter(p => p.rank === 'ASPIRANTE' && (p.status === 'Active' || p.status === 'Auxiliar'))
                            .sort((a, b) => a.legajo.localeCompare(b.legajo, undefined, { numeric: true }));
                        
                        setAllParticipants(aspirantes);

                        if (data.attendance && Object.keys(data.attendance).length > 0) {
                            setAttendance(data.attendance);
                        } else {
                            const initialAttendance: Record<string, AttendanceStatus> = {};
                            aspirantes.forEach(p => {
                                initialAttendance[p.id] = 'present';
                            });
                            setAttendance(initialAttendance);
                        }
                    }
                } catch (error) {
                    toast({ title: "Error", description: "No se pudo cargar el taller.", variant: "destructive" });
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchSession();
    }, [sessionId, toast]);

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

    if (loading) return <div className="space-y-8"><Skeleton className="h-20 w-full" /><Skeleton className="h-96 w-full" /></div>;
    if (!session) return <div className="p-8 text-center">Taller no encontrado.</div>;
    
    const handleStatusChange = (firefighterId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({...prev, [firefighterId]: status}));
    }

    const handleSaveChanges = async () => {
        setSaving(true);
        try {
            if (!user) throw new Error("Usuario no autenticado");
            await updateAspiranteWorkshopAttendance(sessionId, attendance, user);
            toast({ title: "¡Éxito!", description: "La asistencia ha sido guardada correctamente." });
        } catch (error) {
             toast({ title: "Error", description: "No se pudo guardar la asistencia.", variant: "destructive" });
        } finally {
            setLoading(false);
            setSaving(false);
        }
    };

    const formattedDate = format(parseISO(session.date), "dd 'de' MMMM 'de' yyyy", { locale: es });

    return (
        <>
            <PageHeader title={`Asistencia: ${session.title}`} description={`Taller del ${formattedDate} @ ${session.startTime}hs.`}>
                <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Exportar</Button>
            </PageHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="md:col-span-2">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><UserCog className="h-4 w-4" /> Personal de Instrucción</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Instructores:</p>
                            <div className="flex flex-wrap gap-2">{session.instructors.map(i => <Badge key={i.id} variant="destructive">{i.legajo} - {i.lastName}</Badge>)}</div>
                        </div>
                        {session.assistants.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Ayudantes:</p>
                                <div className="flex flex-wrap gap-2">{session.assistants.map(a => <Badge key={a.id} variant="secondary">{a.legajo} - {a.lastName}</Badge>)}</div>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Resumen Aspirantes</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm"><span>Presentes:</span> <span className="font-bold text-green-600">{summary.present + summary.recupero}</span></div>
                        <div className="flex justify-between text-sm"><span>Total Alumnos:</span> <span className="font-bold">{summary.total}</span></div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue={canEdit ? "register" : "view"} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6"><TabsTrigger value="register">Registrar</TabsTrigger><TabsTrigger value="view">Ver Listado</TabsTrigger></TabsList>
                <TabsContent value="register">
                    <Card>
                        <CardHeader><CardTitle>Lista de Alumnos (Aspirantes)</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Legajo y Nombre</TableHead><TableHead className="text-right">Estado</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {allParticipants.map(f => (
                                        <TableRow key={f.id}>
                                            <TableCell className="font-medium">{f.legajo} - {f.lastName}, {f.firstName}</TableCell>
                                            <TableCell className="text-right">
                                                <Select value={attendance[f.id]} onValueChange={(s) => handleStatusChange(f.id, s as AttendanceStatus)} disabled={!canEdit}>
                                                    <SelectTrigger className={cn("w-[140px] ml-auto h-8 text-xs", getStatusClass(attendance[f.id]))}><SelectValue /></SelectTrigger>
                                                    <SelectContent>{statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="justify-end border-t pt-4"><Button onClick={handleSaveChanges} disabled={saving}><Save className="mr-2 h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar'}</Button></CardFooter>
                    </Card>
                </TabsContent>
                <TabsContent value="view">
                    <Card>
                        <CardHeader><CardTitle>Asistencia Registrada</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableBody>
                                    {allParticipants.map(f => (
                                        <TableRow key={f.id}>
                                            <TableCell>{f.legajo} - {f.lastName}, {f.firstName}</TableCell>
                                            <TableCell><Badge className={getStatusClass(attendance[f.id])}>{getStatusLabel(attendance[f.id])}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
    );
}
