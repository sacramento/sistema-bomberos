
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sessions } from "@/lib/data";
import { Download, Filter, Eye, Edit, UserCheck, UserX, UserClock, ShieldAlert } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AttendanceStatus = "present" | "absent" | "tardy" | "excused";

const getStatusBadgeClass = (status: AttendanceStatus) => {
    switch (status) {
        case "present": return "bg-green-600 hover:bg-green-700";
        case "absent": return "bg-red-600 hover:bg-red-700";
        case "tardy": return "bg-yellow-500 hover:bg-yellow-600 text-black";
        case "excused": return "bg-violet-600 hover:bg-violet-700";
        default: return "";
    }
}

const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
        case "present": return "Presente";
        case "absent": return "Ausente";
        case "tardy": return "Tarde";
        case "excused": return "Justificado";
        default: return "N/A";
    }
}

function AttendanceContent({ sessionId }: { sessionId: string }) {
    const session = useMemo(() => sessions.find(s => s.id === sessionId), [sessionId]);

    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});

    useEffect(() => {
        if (session) {
            const initialAttendance: Record<string, AttendanceStatus> = {};
            session.attendees.forEach(a => {
                initialAttendance[a.id] = 'present'; 
            });
            setAttendance(initialAttendance);
        }
    }, [session]);


    const summary = useMemo(() => ({
        present: Object.values(attendance).filter(s => s === 'present').length,
        absent: Object.values(attendance).filter(s => s === 'absent').length,
        tardy: Object.values(attendance).filter(s => s === 'tardy').length,
        excused: Object.values(attendance).filter(s => s === 'excused').length,
        total: session?.attendees.length ?? 0
    }), [attendance, session?.attendees.length]);

    if (!session) {
        return (
          <>
            <PageHeader title="Clase No Encontrada" />
            <p>No se pudo encontrar la clase solicitada.</p>
          </>
        )
    }
    
    const handleStatusChange = (firefighterId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({...prev, [firefighterId]: status}));
    }

    const summaryCards = [
        { title: "Presentes", value: summary.present, icon: UserCheck, color: "text-green-500" },
        { title: "Ausentes", value: summary.absent, icon: UserX, color: "text-red-500" },
        { title: "Tardes", value: summary.tardy, icon: UserClock, color: "text-yellow-500" },
        { title: "Justificados", value: summary.excused, icon: ShieldAlert, color: "text-violet-500" },
    ];


    return (
        <>
            <PageHeader title={`Asistencia: ${session.title}`} description={`Clase del ${session.date} a las ${session.startTime}hs.`}>
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
                            <p className="text-xs text-muted-foreground">de {summary.total} bomberos</p>
                        </CardContent>
                    </Card>
                 ))}
            </div>

            <Tabs defaultValue="register" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mb-4">
                    <TabsTrigger value="register"><Edit className="mr-2 h-4 w-4"/>Registrar Asistencia</TabsTrigger>
                    <TabsTrigger value="view"><Eye className="mr-2 h-4 w-4"/>Ver Resumen</TabsTrigger>
                </TabsList>
                
                <TabsContent value="register">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Lista de Asistentes</CardTitle>
                            <CardDescription>Marque el estado de cada bombero asignado a esta clase.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead className="hidden sm:table-cell">Rango</TableHead>
                                            <TableHead className="text-right">Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {session.attendees.map(firefighter => (
                                            <TableRow key={firefighter.id}>
                                                <TableCell className="font-medium">
                                                    <div>{firefighter.name}</div>
                                                    <div className="text-muted-foreground text-sm sm:hidden">{firefighter.rank}</div>
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell">{firefighter.rank}</TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-2 flex-wrap">
                                                        {(['present', 'absent', 'tardy', 'excused'] as const).map((status) => (
                                                            <Button
                                                                key={status}
                                                                variant={attendance[firefighter.id] === status ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => handleStatusChange(firefighter.id, status)}
                                                                className={cn(
                                                                    "min-w-[100px]",
                                                                    attendance[firefighter.id] === status ? getStatusBadgeClass(status) : ""
                                                                )}
                                                            >
                                                                {getStatusLabel(status)}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="view">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Resumen de Asistencia</CardTitle>
                            <CardDescription>Resumen de la asistencia registrada para esta clase.</CardDescription>
                        </Header>
                        <CardContent>
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead className="hidden sm:table-cell">Rango</TableHead>
                                            <TableHead className="hidden md:table-cell">Cuartel</TableHead>
                                            <TableHead>Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {session.attendees.map(firefighter => (
                                            <TableRow key={`view-${firefighter.id}`}>
                                                <TableCell className="font-medium">
                                                    <div>{firefighter.name}</div>
                                                    <div className="text-muted-foreground text-sm sm:hidden">{firefighter.rank}</div>
                                                    <div className="text-muted-foreground text-sm md:hidden">{firefighter.firehouse}</div>
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell">{firefighter.rank}</TableCell>
                                                <TableCell className="hidden md:table-cell">{firefighter.firehouse}</TableCell>
                                                <TableCell>
                                                    <Badge className={cn("whitespace-nowrap", getStatusBadgeClass(attendance[firefighter.id]))}>
                                                        {getStatusLabel(attendance[firefighter.id])}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
    );
}

export default function AttendancePage({ params }: { params: { id: string } }) {
    return <AttendanceContent sessionId={params.id} />;
}
