
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sessions } from "@/lib/data";
import { Download, Filter, Eye, Edit } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ranks = [
    'ASPIRANTE', 'BOMBERO', 'CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO',
    'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR', 'OFICIAL AYUDANTE', 'OFICIAL INSPECTOR',
    'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'
];

type AttendanceStatus = "present" | "absent" | "tardy" | "excused";

const getStatusBadgeVariant = (status: AttendanceStatus) => {
    switch (status) {
        case "present":
            return "default";
        case "tardy":
            return "secondary";
        case "excused":
             return "outline";
        case "absent":
            return "destructive";
        default:
            return "secondary";
    }
};

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

// Main component logic moved to a child component to properly handle params
function AttendanceContent({ sessionId }: { sessionId: string }) {
    const session = useMemo(() => sessions.find(s => s.id === sessionId), [sessionId]);

    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => {
        const initialAttendance: Record<string, AttendanceStatus> = {};
        if (session) {
            session.attendees.forEach(a => {
                initialAttendance[a.id] = 'present'; // Default to present
            });
        }
        return initialAttendance;
    });
    const [filterStation, setFilterStation] = useState('all');
    const [filterRank, setFilterRank] = useState('all');


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

    const filteredAttendees = useMemo(() => {
        return session.attendees.filter(attendee => {
            const stationMatch = filterStation === 'all' || attendee.firehouse === filterStation;
            const rankMatch = filterRank === 'all' || attendee.rank === filterRank;
            return stationMatch && rankMatch;
        });
    }, [session.attendees, filterStation, filterRank]);

    const summary = {
        present: Object.values(attendance).filter(s => s === 'present').length,
        absent: Object.values(attendance).filter(s => s === 'absent').length,
        tardy: Object.values(attendance).filter(s => s === 'tardy').length,
        excused: Object.values(attendance).filter(s => s === 'excused').length,
        total: session.attendees.length
    };
    
    const firehouseOptions = useMemo(() => {
        const houses = new Set(session.attendees.map(a => a.firehouse));
        return ['all', ...Array.from(houses)];
    }, [session.attendees]);

    const rankOptions = useMemo(() => {
        const rankSet = new Set(session.attendees.map(a => a.rank));
        return ['all', ...Array.from(rankSet)];
    }, [session.attendees]);


    return (
        <>
            <PageHeader title={`Asistencia: ${session.title}`} description={`Clase del ${session.date} a las ${session.startTime}hs.`}>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                </Button>
            </PageHeader>

            <Tabs defaultValue="register" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="register"><Edit className="mr-2 h-4 w-4"/>Registrar Asistencia</TabsTrigger>
                    <TabsTrigger value="view"><Eye className="mr-2 h-4 w-4"/>Ver Resumen</TabsTrigger>
                </TabsList>
                
                {/* TAB: REGISTER ATTENDANCE */}
                <TabsContent value="register">
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
                        <div className="md:col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Registrar Asistencia</CardTitle>
                                    <CardDescription>Marque el estado de cada bombero asignado a esta clase.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead>Rango</TableHead>
                                                <TableHead className="text-right">Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredAttendees.map(firefighter => (
                                                <TableRow key={firefighter.id}>
                                                    <TableCell className="font-medium">{firefighter.name}</TableCell>
                                                    <TableCell>{firefighter.rank}</TableCell>
                                                    <TableCell className="text-right">
                                                         <div className="flex justify-end gap-2">
                                                            {(['present', 'absent', 'tardy', 'excused'] as const).map((status) => (
                                                                <Button
                                                                    key={status}
                                                                    variant={attendance[firefighter.id] === status ? "default" : "outline"}
                                                                    size="sm"
                                                                    onClick={() => handleStatusChange(firefighter.id, status)}
                                                                    className={cn(
                                                                        "w-28",
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
                                </CardContent>
                            </Card>
                        </div>
                        <div className="md:col-span-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline flex items-center gap-2">
                                    <Filter className="h-5 w-5"/> Resumen y Filtros
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                     <div className="space-y-4">
                                        <h4 className="font-medium">Resumen General ({summary.total})</h4>
                                        <div className="flex justify-between items-center text-sm"><span>Presente:</span> <span className="font-bold">{summary.present}</span></div>
                                        <div className="flex justify-between items-center text-sm"><span>Ausente:</span> <span className="font-bold">{summary.absent}</span></div>
                                        <div className="flex justify-between items-center text-sm"><span>Tarde:</span> <span className="font-bold">{summary.tardy}</span></div>
                                        <div className="flex justify-between items-center text-sm"><span>Justificado:</span> <span className="font-bold">{summary.excused}</span></div>
                                    </div>
                                    <div className="space-y-2 pt-6 border-t">
                                        <Label>Filtrar por Cuartel</Label>
                                        <Select value={filterStation} onValueChange={setFilterStation}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos los Cuarteles" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {firehouseOptions.map(house => (
                                                    <SelectItem key={house} value={house}>
                                                        {house === 'all' ? 'Todos los Cuarteles' : house}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Filtrar por Rango</Label>
                                        <Select value={filterRank} onValueChange={setFilterRank}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos los Rangos" />
                                            </SelectTrigger>
                                            <SelectContent>
                                            {rankOptions.map(rank => (
                                                 <SelectItem key={rank} value={rank}>
                                                    {rank === 'all' ? 'Todos los Rangos' : rank}
                                                </SelectItem>
                                            ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
                
                {/* TAB: VIEW ATTENDANCE */}
                <TabsContent value="view">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
                        <div className="md:col-span-3">
                             <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Resumen de Asistencia</CardTitle>
                                    <CardDescription>Resumen de la asistencia registrada para esta clase.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead>Rango</TableHead>
                                                <TableHead>Cuartel</TableHead>
                                                <TableHead>Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredAttendees.map(firefighter => (
                                                <TableRow key={`view-${firefighter.id}`}>
                                                    <TableCell className="font-medium">{firefighter.name}</TableCell>
                                                    <TableCell>{firefighter.rank}</TableCell>
                                                    <TableCell>{firefighter.firehouse}</TableCell>
                                                    <TableCell>
                                                         <Badge variant={getStatusBadgeVariant(attendance[firefighter.id])} className={getStatusBadgeClass(attendance[firefighter.id])}>
                                                            {getStatusLabel(attendance[firefighter.id])}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                         <div className="md:col-span-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline flex items-center gap-2">
                                    <Filter className="h-5 w-5"/> Resumen y Filtros
                                    </CardTitle>
                                </CardHeader>
                               <CardContent className="space-y-6">
                                     <div className="space-y-4">
                                        <h4 className="font-medium">Resumen General ({summary.total})</h4>
                                        <div className="flex justify-between items-center text-sm"><span>Presente:</span> <span className="font-bold">{summary.present}</span></div>
                                        <div className="flex justify-between items-center text-sm"><span>Ausente:</span> <span className="font-bold">{summary.absent}</span></div>
                                        <div className="flex justify-between items-center text-sm"><span>Tarde:</span> <span className="font-bold">{summary.tardy}</span></div>
                                        <div className="flex justify-between items-center text-sm"><span>Justificado:</span> <span className="font-bold">{summary.excused}</span></div>
                                    </div>
                                    <div className="space-y-2 pt-6 border-t">
                                        <Label>Filtrar por Cuartel</Label>
                                        <Select value={filterStation} onValueChange={setFilterStation}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos los Cuarteles" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {firehouseOptions.map(house => (
                                                    <SelectItem key={house} value={house}>
                                                        {house === 'all' ? 'Todos los Cuarteles' : house}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Filtrar por Rango</Label>
                                        <Select value={filterRank} onValueChange={setFilterRank}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos los Rangos" />
                                            </SelectTrigger>
                                            <SelectContent>
                                            {rankOptions.map(rank => (
                                                 <SelectItem key={rank} value={rank}>
                                                    {rank === 'all' ? 'Todos los Rangos' : rank}
                                                </SelectItem>
                                            ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </>
    );
}


export default function AttendancePage({ params }: { params: { id: string } }) {
    return <AttendanceContent sessionId={params.id} />;
}
