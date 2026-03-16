
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar as CalendarIcon, Download, Loader2, UserCheck, UserX, Clock, ShieldAlert, Percent, GraduationCap, Users, Check, ChevronsUpDown, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Firefighter, Session, AttendanceStatus, Specialization, Course } from "@/lib/types";
import { getSessions } from "@/services/sessions.service";
import { getAspiranteSessions } from "@/services/aspirantes-sessions.service";
import { getWorkshops } from "@/services/workshops.service";
import { getAspiranteWorkshops } from "@/services/aspirantes-workshops.service";
import { getCourses } from "@/services/courses.service";
import { getFirefighters } from "@/services/firefighters.service";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cn } from "@/lib/utils";

const PIE_CHART_COLORS = {
    present: "#22C55E",
    absent: "#EF4444",
    tardy: "#FBBF24",
    excused: "#8B5CF6",
    recupero: "#3B82F6",
};

const hierarchyOptions = [
    { value: 'aspirantes', label: 'Aspirantes' },
    { value: 'bomberos', label: 'Bomberos' },
    { value: 'suboficiales_oficiales', label: 'Suboficiales y Oficiales' }
];

const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'GENERAL'];

const getStatusClass = (status: AttendanceStatus) => {
    switch (status) {
        case "present": return "bg-green-600 text-white";
        case "absent": return "bg-red-600 text-white";
        case "tardy": return "bg-yellow-500 text-black";
        case "excused": return "bg-violet-600 text-white";
        case "recupero": return "bg-blue-600 text-white";
        default: return "";
    }
}

const getStatusLabel = (status: AttendanceStatus) => {
    const labels: Record<AttendanceStatus, string> = { present: "Presente", absent: "Ausente", tardy: "Tarde", excused: "Justificado", recupero: "Recuperó" };
    return labels[status] || "N/A";
}

export function ClassesReportTab({ context = 'asistencia' }: { context?: 'asistencia' | 'aspirantes' }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
    const [openCombobox, setOpenCombobox] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [sessionsData, firefightersData] = await Promise.all([
                    context === 'asistencia' ? getSessions() : getAspiranteSessions(),
                    getFirefighters(),
                ]);
                setAllSessions(sessionsData);
                setAllFirefighters(firefightersData);
            } catch (error) {
                toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [context, toast]);

    const reportData = useMemo(() => {
        const records: any[] = [];
        const filtered = allSessions.filter(s => {
            if (filterSpecialization !== 'all' && s.specialization !== filterSpecialization) return false;
            if (filterYear !== 'all' && parseISO(s.date).getFullYear().toString() !== filterYear) return false;
            return true;
        });

        filtered.forEach(s => {
            // En el contexto de aspirantes, solo reportamos sobre los Aspirantes asignados
            s.attendees.forEach(f => {
                if (context === 'aspirantes' && f.rank !== 'ASPIRANTE') return;
                if (filterFirefighter !== 'all' && f.id !== filterFirefighter) return;
                
                const status = s.attendance?.[f.id] || 'present';
                records.push({ firefighter: f, status, session: s });
            });
        });

        const counts = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as any);
        const pieData = Object.entries(counts).map(([name, value]) => ({ 
            name: getStatusLabel(name as any), 
            value, 
            fill: (PIE_CHART_COLORS as any)[name] || '#ccc' 
        })).filter(d => d.value > 0);

        return { details: records, pieData };
    }, [allSessions, filterSpecialization, filterFirefighter, filterYear, context]);

    if (loading) return <Skeleton className="h-96 w-full" />;

    const firefighterList = allFirefighters.filter(f => context === 'aspirantes' ? f.rank === 'ASPIRANTE' : f.rank !== 'ASPIRANTE');

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle className="text-lg">Filtros de Reporte</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Año</Label>
                        <Select value={filterYear} onValueChange={setFilterYear}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{[...new Set(allSessions.map(s => parseISO(s.date).getFullYear().toString()))].sort().map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{context === 'aspirantes' ? 'Aspirante' : 'Bombero'}</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-auto min-h-10 text-xs">
                                {filterFirefighter !== 'all' ? `${allFirefighters.find(f => f.id === filterFirefighter)?.legajo} - ${allFirefighters.find(f => f.id === filterFirefighter)?.lastName}` : "Todos"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button></PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Buscar integrante..." /><CommandList><CommandEmpty>No hay resultados.</CommandEmpty><CommandGroup><CommandItem onSelect={() => {setFilterFirefighter('all'); setOpenCombobox(false);}}>Todos</CommandItem>{firefighterList.map(f => <CommandItem key={f.id} onSelect={() => {setFilterFirefighter(f.id); setOpenCombobox(false);}}>{f.legajo} - {f.lastName}, {f.firstName}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Especialidad</Label>
                        <Select value={filterSpecialization} onValueChange={setFilterSpecialization}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                    </div>
                </CardContent>
            </Card>
            {reportData.details.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card><CardHeader><CardTitle>Distribución de Asistencia</CardTitle></CardHeader><CardContent><ChartContainer config={{}} className="h-64"><ResponsiveContainer><PieChart><Pie data={reportData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>{reportData.pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></ChartContainer></CardContent></Card>
                    <Card><CardHeader><CardTitle>Listado Detallado</CardTitle></CardHeader><CardContent className="max-h-[300px] overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Integrante</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{reportData.details.map((r, i) => <TableRow key={i}><TableCell>{r.firefighter.legajo} - {r.firefighter.lastName}</TableCell><TableCell><Badge className={getStatusClass(r.status)}>{getStatusLabel(r.status)}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
                </div>
            ) : <div className="text-center py-20 border-2 border-dashed rounded-lg text-muted-foreground italic">No hay registros de aspirantes con estos filtros.</div>}
        </div>
    );
}

export function WorkshopsReportTab({ context = 'asistencia' }: { context?: 'asistencia' | 'aspirantes' }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
    const [openCombobox, setOpenCombobox] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [workshopsData, firefightersData] = await Promise.all([
                    context === 'asistencia' ? getWorkshops() : getAspiranteWorkshops(),
                    getFirefighters(),
                ]);
                setAllSessions(workshopsData);
                setAllFirefighters(firefightersData);
            } catch (error) {
                toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [context, toast]);

    const reportData = useMemo(() => {
        const records: any[] = [];
        const filtered = allSessions.filter(s => {
            if (filterSpecialization !== 'all' && s.specialization !== filterSpecialization) return false;
            if (filterYear !== 'all' && parseISO(s.date).getFullYear().toString() !== filterYear) return false;
            return true;
        });

        filtered.forEach(s => {
            s.attendees.forEach(f => {
                if (context === 'aspirantes' && f.rank !== 'ASPIRANTE') return;
                if (filterFirefighter !== 'all' && f.id !== filterFirefighter) return;
                const status = s.attendance?.[f.id] || 'present';
                records.push({ firefighter: f, status, session: s });
            });
        });

        const counts = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as any);
        const pieData = Object.entries(counts).map(([name, value]) => ({ 
            name: getStatusLabel(name as any), 
            value, 
            fill: (PIE_CHART_COLORS as any)[name] || '#ccc' 
        })).filter(d => d.value > 0);

        return { details: records, pieData };
    }, [allSessions, filterSpecialization, filterFirefighter, filterYear, context]);

    if (loading) return <Skeleton className="h-96 w-full" />;

    const firefighterList = allFirefighters.filter(f => context === 'aspirantes' ? f.rank === 'ASPIRANTE' : f.rank !== 'ASPIRANTE');

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle className="text-lg">Filtros de Taller</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Año</Label>
                        <Select value={filterYear} onValueChange={setFilterYear}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{[...new Set(allSessions.map(s => parseISO(s.date).getFullYear().toString()))].sort().map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{context === 'aspirantes' ? 'Aspirante' : 'Bombero'}</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-auto min-h-10 text-xs">
                                {filterFirefighter !== 'all' ? `${allFirefighters.find(f => f.id === filterFirefighter)?.legajo} - ${allFirefighters.find(f => f.id === filterFirefighter)?.lastName}` : "Todos"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button></PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Buscar integrante..." /><CommandList><CommandGroup><CommandItem onSelect={() => {setFilterFirefighter('all'); setOpenCombobox(false);}}>Todos</CommandItem>{firefighterList.map(f => <CommandItem key={f.id} onSelect={() => {setFilterFirefighter(f.id); setOpenCombobox(false);}}>{f.legajo} - {f.lastName}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Especialidad</Label>
                        <Select value={filterSpecialization} onValueChange={setFilterSpecialization}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                    </div>
                </CardContent>
            </Card>
            {reportData.details.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card><CardHeader><CardTitle>Distribución</CardTitle></CardHeader><CardContent><ChartContainer config={{}} className="h-64"><ResponsiveContainer><PieChart><Pie data={reportData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>{reportData.pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></ChartContainer></CardContent></Card>
                    <Card><CardHeader><CardTitle>Resultados</CardTitle></CardHeader><CardContent className="max-h-[300px] overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{reportData.details.map((r, i) => <TableRow key={i}><TableCell>{r.firefighter.legajo} - {r.firefighter.lastName}</TableCell><TableCell><Badge className={getStatusClass(r.status)}>{getStatusLabel(r.status)}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
                </div>
            ) : <div className="text-center py-20 border-2 border-dashed rounded-lg italic text-muted-foreground">Sin datos para mostrar.</div>}
        </div>
    );
}

export function CoursesReportTab({ context = 'asistencia' }: { context?: 'asistencia' | 'aspirantes' }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [openCombobox, setOpenCombobox] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [cData, fData] = await Promise.all([getCourses(), getFirefighters()]);
                setAllFirefighters(fData);
                if (context === 'aspirantes') {
                    const aspIds = new Set(fData.filter(f => f.rank === 'ASPIRANTE').map(f => f.id));
                    setAllCourses(cData.filter(c => aspIds.has(c.firefighterId)));
                } else {
                    const nonAspIds = new Set(fData.filter(f => f.rank !== 'ASPIRANTE').map(f => f.id));
                    setAllCourses(cData.filter(c => nonAspIds.has(c.firefighterId)));
                }
            } catch (error) {
                toast({ title: "Error", description: "No se pudieron cargar los cursos.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [context, toast]);

    const filtered = allCourses.filter(c => filterFirefighter === 'all' || c.firefighterId === filterFirefighter);

    if (loading) return <Skeleton className="h-96 w-full" />;

    const firefighterList = allFirefighters.filter(f => context === 'aspirantes' ? f.rank === 'ASPIRANTE' : f.rank !== 'ASPIRANTE');

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Filtro de Cursos Externos</CardTitle></CardHeader>
                <CardContent>
                    <Label>{context === 'aspirantes' ? 'Aspirante' : 'Bombero'}</Label>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-auto min-h-10 text-xs">
                            {filterFirefighter !== 'all' ? `${allFirefighters.find(f => f.id === filterFirefighter)?.legajo} - ${allFirefighters.find(f => f.id === filterFirefighter)?.lastName}` : "Todos"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button></PopoverTrigger>
                        <PopoverContent className="p-0"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty><CommandGroup><CommandItem onSelect={() => {setFilterFirefighter('all'); setOpenCombobox(false);}}>Todos</CommandItem>{firefighterList.map(f => <CommandItem key={f.id} onSelect={() => {setFilterFirefighter(f.id); setOpenCombobox(false);}}>{f.legajo} - {f.lastName}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
                    </Popover>
                </CardContent>
            </Card>
            <Card><CardHeader><CardTitle>Resultados</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Legajo</TableHead><TableHead>Nombre</TableHead><TableHead>Curso</TableHead><TableHead>Lugar</TableHead></TableRow></TableHeader><TableBody>{filtered.map(c => <TableRow key={c.id}><TableCell>{c.firefighterLegajo}</TableCell><TableCell>{c.firefighterName}</TableCell><TableCell>{c.title}</TableCell><TableCell>{c.location}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        </div>
    );
}
