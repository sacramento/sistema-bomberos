'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sessions } from "@/lib/data";
import { Download, Eye, Edit, UserCheck, UserX, Clock, ShieldAlert } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AttendanceStatus = "present" | "absent" | "tardy" | "excused";

const statusOptions: { value: AttendanceStatus; label: string }[] = [
    { value: "present", label: "Presente" },
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
        default: return "";
    }
}

const getStatusLabel = (status: AttendanceStatus) => {
    return statusOptions.find(o => o.value === status)?.label || "N/A";
}


export default function AttendancePage() {
    const params = useParams();
    const sessionId = params.id as string;
    
    const session = useMemo(() => sessions.find(s => s.id === sessionId), [sessionId]);
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});

    useEffect(() => {
        if (session) {
            const initialAttendance: Record<string, AttendanceStatus> = {};
            session.attendees.forEach(a => {
                // Default all attendees to 'present' initially
                initialAttendance[a.id] = 'present'; 
            });
            setAttendance(initialAttendance);
        }
    }, [session]);

    const summary = useMemo(() => {
        if (!session) return { present: 0, absent: 0, tardy: 0, excused: 0, total: 0 };
        const total = session.attendees.length;
        const present = Object.values(attendance).filter(s => s === 'present').length;
        const absent = Object.values(attendance).filter(s => s === 'absent').length;
        const tardy = Object.values(attendance).filter(s => s === 'tardy').length;
        const excused = Object.values(attendance).filter(s => s === 'excused').length;
        return { present, absent, tardy, excused, total };
    }, [attendance, session]);

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

    const summaryCards = [
        { title: "Presentes", value: summary.present, icon: UserCheck, color: "text-green-500" },
        { title: "Ausentes", value: summary.absent, icon: UserX, color: "text-red-500" },
        { title: "Tardes", value: summary.tardy, icon: Clock, color: "text-yellow-500" },
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
                            <CardDescription>Seleccione el estado de cada bombero asignado a esta clase.</CardDescription>
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
                                                <TableCell className="text-right">
                                                     <Select 
                                                        value={attendance[firefighter.id]} 
                                                        onValueChange={(status) => handleStatusChange(firefighter.id, status as AttendanceStatus)}
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
                        </CardHeader>
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
                                                    <Badge className={cn("whitespace-nowrap", getStatusClass(attendance[firefighter.id]))}>
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
