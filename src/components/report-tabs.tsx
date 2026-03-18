
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar as CalendarIcon, UserCheck, UserX, Clock, ShieldAlert, Percent, GraduationCap, Users, Check, ChevronsUpDown, Filter, BarChart3, ListFilter, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
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
import { cn } from "@/lib/utils";

const PIE_CHART_COLORS = {
    present: "#22C55E",
    absent: "#EF4444",
    tardy: "#FBBF24",
    excused: "#8B5CF6",
    recupero: "#3B82F6",
};

const hierarchyGroups = [
    { id: 'aspirantes', label: 'Aspirantes', ranks: ['ASPIRANTE'] },
    { id: 'bomberos', label: 'Bomberos', ranks: ['BOMBERO', 'ADAPTACION'] },
    { id: 'suboficiales_oficiales', label: 'Oficiales y Suboficiales', ranks: ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR', 'OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'] }
];

const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'GENERAL'];
const firehouses = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

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

type AttendanceStats = {
    firefighter: Firefighter;
    total: number;
    present: number;
    absent: number;
    tardy: number;
    excused: number;
    recupero: number;
    percentage: number;
};

export function ClassesReportTab({ context = 'asistencia' }: { context?: 'asistencia' | 'aspirantes' }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    
    // Filters
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterFirehouse, setFilterFirehouse] = useState('all');
    const [filterHierarchy, setFilterHierarchy] = useState('all');
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [viewMode, setViewMode] = useState<'totals' | 'percentages'>('totals');
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
        const filteredSessions = allSessions.filter(s => {
            if (filterSpecialization !== 'all' && s.specialization !== filterSpecialization) return false;
            if (filterDate?.from) {
                const sDate = parseISO(s.date);
                const toDate = filterDate.to || filterDate.from;
                if (!isWithinInterval(sDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return false;
            }
            return true;
        });

        const statsMap = new Map<string, AttendanceStats>();

        filteredSessions.forEach(s => {
            s.attendees.forEach(f => {
                // Filtros de persona
                if (context === 'aspirantes' && f.rank !== 'ASPIRANTE') return;
                if (filterFirehouse !== 'all' && f.firehouse !== filterFirehouse) return;
                if (filterHierarchy !== 'all') {
                    const group = hierarchyGroups.find(g => g.id === filterHierarchy);
                    if (!group?.ranks.includes(f.rank)) return;
                }
                if (filterFirefighter !== 'all' && f.id !== filterFirefighter) return;

                const status = s.attendance?.[f.id] || 'present';
                
                if (!statsMap.has(f.id)) {
                    statsMap.set(f.id, { firefighter: f, total: 0, present: 0, absent: 0, tardy: 0, excused: 0, recupero: 0, percentage: 0 });
                }
                
                const current = statsMap.get(f.id)!;
                current.total++;
                if (status === 'present') current.present++;
                if (status === 'absent') current.absent++;
                if (status === 'tardy') current.tardy++;
                if (status === 'excused') current.excused++;
                if (status === 'recupero') current.recupero++;
            });
        });

        const statsArray = Array.from(statsMap.values()).map(s => {
            const effectiveAttendance = s.present + s.recupero + (s.tardy * 0.5);
            const totalForPercentage = s.total; // Podemos decidir si las justificadas restan del total o no
            s.percentage = totalForPercentage > 0 ? (effectiveAttendance / totalForPercentage) * 100 : 0;
            return s;
        }).sort((a, b) => b.percentage - a.percentage);

        const totals = statsArray.reduce((acc, s) => {
            acc.present += s.present;
            acc.absent += s.absent;
            acc.tardy += s.tardy;
            acc.excused += s.excused;
            acc.recupero += s.recupero;
            return acc;
        }, { present: 0, absent: 0, tardy: 0, excused: 0, recupero: 0 });

        const pieData = Object.entries(totals).map(([name, value]) => ({
            name: getStatusLabel(name as any),
            value,
            fill: (PIE_CHART_COLORS as any)[name] || '#ccc'
        })).filter(d => d.value > 0);

        return { stats: statsArray, pieData };
    }, [allSessions, filterSpecialization, filterDate, filterFirehouse, filterHierarchy, filterFirefighter, context]);

    if (loading) return <Skeleton className="h-96 w-full" />;

    const firefighterList = allFirefighters.filter(f => {
        if (context === 'aspirantes') return f.rank === 'ASPIRANTE';
        return f.rank !== 'ASPIRANTE';
    });

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5" /> Filtros del Reporte</CardTitle>
                        <div className="flex bg-muted p-1 rounded-md">
                            <Button variant={viewMode === 'totals' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('totals')} className="h-8 px-3 text-xs">Totales</Button>
                            <Button variant={viewMode === 'percentages' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('percentages')} className="h-8 px-3 text-xs">Porcentajes</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <div className="space-y-2">
                        <Label>Período</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 text-xs", !filterDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDate?.from ? (filterDate.to ? <>{format(filterDate.from, "dd/MM/yy")} - {format(filterDate.to, "dd/MM/yy")}</> : format(filterDate.from, "dd/MM/yy")) : "Cualquier fecha"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={filterDate?.from} selected={filterDate} onSelect={setFilterDate} locale={es} numberOfMonths={2}/></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Especialidad</Label>
                        <Select value={filterSpecialization} onValueChange={setFilterSpecialization}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Cuartel</Label>
                        <Select value={filterFirehouse} onValueChange={setFilterFirehouse}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{firehouses.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Jerarquía</Label>
                        <Select value={filterHierarchy} onValueChange={setFilterHierarchy} disabled={context === 'aspirantes'}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Cualquiera</SelectItem>{hierarchyGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Integrante Específico</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-10 text-xs overflow-hidden">
                                <span className="truncate">{filterFirefighter !== 'all' ? allFirefighters.find(f => f.id === filterFirefighter)?.lastName : "Todos"}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button></PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty><CommandGroup><CommandItem onSelect={() => {setFilterFirefighter('all'); setOpenCombobox(false);}}>Todos</CommandItem>{firefighterList.map(f => <CommandItem key={f.id} onSelect={() => {setFilterFirefighter(f.id); setOpenCombobox(false);}}>{f.legajo} - {f.lastName}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader><CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4"/> Distribución General</CardTitle></CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={reportData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                                        {reportData.pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2"><LayoutGrid className="h-4 w-4"/> Tabla de Asistencia</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[350px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Integrante</TableHead>
                                        <TableHead className="text-center">Asis.</TableHead>
                                        <TableHead className="text-center">Aus.</TableHead>
                                        <TableHead className="text-center">Tar.</TableHead>
                                        <TableHead className="text-center">Rec.</TableHead>
                                        <TableHead className="text-right">Tasa</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.stats.map((s) => (
                                        <TableRow key={s.firefighter.id}>
                                            <TableCell className="font-medium whitespace-nowrap text-xs">
                                                {s.firefighter.legajo} - {s.firefighter.lastName}
                                            </TableCell>
                                            <TableCell className="text-center">{s.present}</TableCell>
                                            <TableCell className="text-center text-red-600 font-medium">{s.absent}</TableCell>
                                            <TableCell className="text-center">{s.tardy}</TableCell>
                                            <TableCell className="text-center">{s.recupero}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={s.percentage >= 80 ? 'default' : 'secondary'} className={cn(s.percentage >= 80 ? 'bg-green-600' : '')}>
                                                    {s.percentage.toFixed(0)}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {reportData.stats.length === 0 && (
                                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">No se encontraron registros para estos filtros.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export function WorkshopsReportTab({ context = 'asistencia' }: { context?: 'asistencia' | 'aspirantes' }) {
    // Reutilizamos la lógica de ClassesReportTab pero cargando los datos de talleres
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [allWorkshops, setAllWorkshops] = useState<Session[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterFirehouse, setFilterFirehouse] = useState('all');
    const [filterHierarchy, setFilterHierarchy] = useState('all');
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [viewMode, setViewMode] = useState<'totals' | 'percentages'>('totals');
    const [openCombobox, setOpenCombobox] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [workshopsData, firefightersData] = await Promise.all([
                    context === 'asistencia' ? getWorkshops() : getAspiranteWorkshops(),
                    getFirefighters(),
                ]);
                setAllWorkshops(workshopsData);
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
        const filtered = allWorkshops.filter(s => {
            if (filterSpecialization !== 'all' && s.specialization !== filterSpecialization) return false;
            if (filterDate?.from) {
                const sDate = parseISO(s.date);
                const toDate = filterDate.to || filterDate.from;
                if (!isWithinInterval(sDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return false;
            }
            return true;
        });

        const statsMap = new Map<string, AttendanceStats>();

        filtered.forEach(s => {
            s.attendees.forEach(f => {
                if (context === 'aspirantes' && f.rank !== 'ASPIRANTE') return;
                if (filterFirehouse !== 'all' && f.firehouse !== filterFirehouse) return;
                if (filterHierarchy !== 'all') {
                    const group = hierarchyGroups.find(g => g.id === filterHierarchy);
                    if (!group?.ranks.includes(f.rank)) return;
                }
                if (filterFirefighter !== 'all' && f.id !== filterFirefighter) return;

                const status = s.attendance?.[f.id] || 'present';
                if (!statsMap.has(f.id)) statsMap.set(f.id, { firefighter: f, total: 0, present: 0, absent: 0, tardy: 0, excused: 0, recupero: 0, percentage: 0 });
                const current = statsMap.get(f.id)!;
                current.total++;
                if (status === 'present') current.present++;
                if (status === 'absent') current.absent++;
                if (status === 'tardy') current.tardy++;
                if (status === 'excused') current.excused++;
                if (status === 'recupero') current.recupero++;
            });
        });

        const statsArray = Array.from(statsMap.values()).map(s => {
            const effectiveAttendance = s.present + s.recupero + (s.tardy * 0.5);
            s.percentage = s.total > 0 ? (effectiveAttendance / s.total) * 100 : 0;
            return s;
        }).sort((a, b) => b.percentage - a.percentage);

        const totals = statsArray.reduce((acc, s) => {
            acc.present += s.present; acc.absent += s.absent; acc.tardy += s.tardy; acc.excused += s.excused; acc.recupero += s.recupero;
            return acc;
        }, { present: 0, absent: 0, tardy: 0, excused: 0, recupero: 0 });

        const pieData = Object.entries(totals).map(([name, value]) => ({
            name: getStatusLabel(name as any), value, fill: (PIE_CHART_COLORS as any)[name] || '#ccc'
        })).filter(d => d.value > 0);

        return { stats: statsArray, pieData };
    }, [allWorkshops, filterSpecialization, filterDate, filterFirehouse, filterHierarchy, filterFirefighter, context]);

    if (loading) return <Skeleton className="h-96 w-full" />;

    const firefighterList = allFirefighters.filter(f => context === 'aspirantes' ? f.rank === 'ASPIRANTE' : f.rank !== 'ASPIRANTE');

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5" /> Filtros de Taller</CardTitle>
                        <div className="flex bg-muted p-1 rounded-md">
                            <Button variant={viewMode === 'totals' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('totals')} className="h-8 px-3 text-xs">Totales</Button>
                            <Button variant={viewMode === 'percentages' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('percentages')} className="h-8 px-3 text-xs">Porcentajes</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <div className="space-y-2">
                        <Label>Período</Label>
                        <Popover>
                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal h-10 text-xs"><CalendarIcon className="mr-2 h-4 w-4" />{filterDate?.from ? (filterDate.to ? <>{format(filterDate.from, "dd/MM/yy")} - {format(filterDate.to, "dd/MM/yy")}</> : format(filterDate.from, "dd/MM/yy")) : "Cualquier fecha"}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" selected={filterDate} onSelect={setFilterDate} locale={es} numberOfMonths={2}/></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2"><Label>Especialidad</Label><Select value={filterSpecialization} onValueChange={setFilterSpecialization}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Cuartel</Label><Select value={filterFirehouse} onValueChange={setFilterFirehouse}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{firehouses.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Jerarquía</Label><Select value={filterHierarchy} onValueChange={setFilterHierarchy} disabled={context === 'aspirantes'}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Cualquiera</SelectItem>{hierarchyGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Integrante</Label><Popover open={openCombobox} onOpenChange={setOpenCombobox}><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-10 text-xs truncate">{filterFirefighter !== 'all' ? allFirefighters.find(f => f.id === filterFirefighter)?.lastName : "Todos"}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty><CommandGroup><CommandItem onSelect={() => {setFilterFirefighter('all'); setOpenCombobox(false);}}>Todos</CommandItem>{firefighterList.map(f => <CommandItem key={f.id} onSelect={() => {setFilterFirefighter(f.id); setOpenCombobox(false);}}>{f.legajo} - {f.lastName}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>
                </CardContent>
            </Card>
            {reportData.stats.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card><CardHeader><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Distribución de Asistencia</CardTitle></CardHeader><CardContent className="h-64"><ResponsiveContainer><PieChart><Pie data={reportData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>{reportData.pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Resumen de Alumnos</CardTitle></CardHeader><CardContent className="p-0"><ScrollArea className="h-[350px] overflow-auto"><Table><TableHeader><TableRow><TableHead>Integrante</TableHead><TableHead className="text-center">Asis.</TableHead><TableHead className="text-center">Aus.</TableHead><TableHead className="text-right">Tasa</TableHead></TableRow></TableHeader><TableBody>{reportData.stats.map((s) => (<TableRow key={s.firefighter.id}><TableCell className="text-xs font-medium">{s.firefighter.legajo} - {s.firefighter.lastName}</TableCell><TableCell className="text-center">{s.present + s.recupero}</TableCell><TableCell className="text-center text-red-600">{s.absent}</TableCell><TableCell className="text-right"><Badge variant={s.percentage >= 80 ? 'default' : 'secondary'} className={cn(s.percentage >= 80 ? 'bg-green-600' : '')}>{s.percentage.toFixed(0)}%</Badge></TableCell></TableRow>))}</TableBody></Table></ScrollArea></CardContent></Card>
                </div>
            ) : <div className="text-center py-20 border-2 border-dashed rounded-lg text-muted-foreground italic">No hay registros con estos filtros.</div>}
        </div>
    );
}

export function CoursesReportTab({ context = 'asistencia' }: { context?: 'asistencia' | 'aspirantes' }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [filterFirehouse, setFilterFirehouse] = useState('all');
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

    const filtered = allCourses.filter(c => {
        if (filterFirefighter !== 'all' && c.firefighterId !== filterFirefighter) return false;
        if (filterFirehouse !== 'all') {
            const f = allFirefighters.find(f => f.id === c.firefighterId);
            if (f?.firehouse !== filterFirehouse) return false;
        }
        return true;
    });

    if (loading) return <Skeleton className="h-96 w-full" />;

    const firefighterList = allFirefighters.filter(f => context === 'aspirantes' ? f.rank === 'ASPIRANTE' : f.rank !== 'ASPIRANTE');

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ListFilter className="h-5 w-5"/> Filtros de Cursos Externos</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Cuartel</Label>
                        <Select value={filterFirehouse} onValueChange={setFilterFirehouse}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{firehouses.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{context === 'aspirantes' ? 'Aspirante' : 'Bombero'}</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-10 text-xs truncate">
                                {filterFirefighter !== 'all' ? allFirefighters.find(f => f.id === filterFirefighter)?.lastName : "Todos"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button></PopoverTrigger>
                            <PopoverContent className="p-0"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty><CommandGroup><CommandItem onSelect={() => {setFilterFirefighter('all'); setOpenCombobox(false);}}>Todos</CommandItem>{firefighterList.map(f => <CommandItem key={f.id} onSelect={() => {setFilterFirefighter(f.id); setOpenCombobox(false);}}>{f.legajo} - {f.lastName}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4"/> Listado de Capacitaciones Externas</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Integrante</TableHead>
                                <TableHead>Curso</TableHead>
                                <TableHead>Lugar</TableHead>
                                <TableHead className="text-right">Fecha</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell className="text-xs font-medium">{c.firefighterLegajo} - {c.firefighterName}</TableCell>
                                    <TableCell className="text-xs">{c.title}</TableCell>
                                    <TableCell className="text-xs">{c.location}</TableCell>
                                    <TableCell className="text-right text-xs font-mono">{format(parseISO(c.startDate), 'dd/MM/yy')}</TableCell>
                                </TableRow>
                            ))}
                            {filtered.length === 0 && (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No hay cursos registrados con estos filtros.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function ScrollArea({ className, children }: { className?: string, children: React.ReactNode }) {
    return <div className={cn("relative overflow-auto", className)}>{children}</div>;
}
