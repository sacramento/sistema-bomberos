
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar as CalendarIcon, Download, Loader2, UserCheck, UserX, Clock, ShieldAlert, Percent, GraduationCap, Users, Check, ChevronsUpDown } from "lucide-react";
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
import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts";
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

const SPECIALIZATION_CHART_COLORS: Record<string, string> = {
    'RESCATE VEHICULAR': "#3B82F6",
    'RESCATE URBANO': "#1D4ED8",
    FUEGO: "#EF4444",
    APH: "#22C55E",
    'HAZ-MAT': "#F97316",
    FORESTAL: "#16A34A",
    BUCEO: "#0EA5E9",
    PAE: "#FBBF24",
    GORA: "#A855F7",
    KAIZEN: "#6366F1",
    GENERAL: "#64748B",
};

const hierarchyOptions = [
    { value: 'aspirantes', label: 'Aspirantes' },
    { value: 'bomberos', label: 'Bomberos' },
    { value: 'suboficiales_oficiales', label: 'Suboficiales y Oficiales' }
];

const stationOptions = [
    { value: 'Cuartel 1', label: 'Cuartel 1' },
    { value: 'Cuartel 2', label: 'Cuartel 2' },
    { value: 'Cuartel 3', label: 'Cuartel 3' },
];

const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'GENERAL'];

const getStatusClass = (status: AttendanceStatus) => {
    switch (status) {
        case "present": return "bg-green-600 hover:bg-green-700 text-white border-green-600";
        case "absent": return "bg-red-600 hover:bg-red-700 text-white border-red-600";
        case "tardy": return "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500";
        case "excused": return "bg-violet-600 hover:bg-violet-700 text-white border-violet-600";
        case "recupero": return "bg-blue-600 hover:bg-blue-700 text-white border-blue-600";
        default: return "";
    }
}

const getStatusLabel = (status: AttendanceStatus) => {
    const labels: Record<AttendanceStatus, string> = { present: "Presente", absent: "Ausente", tardy: "Tarde", excused: "Justificado", recupero: "Recuperó" };
    return labels[status] || "N/A";
}

const MultiSelectFilter = ({
    title,
    options,
    selected,
    onSelectedChange
}: {
    title: string;
    options: { value: string; label: string }[];
    selected: string[];
    onSelectedChange: (selected: string[]) => void;
}) => {
    const [open, setOpen] = useState(false);
    const handleSelect = (value: string) => {
        const isSelected = selected.includes(value);
        onSelectedChange(isSelected ? selected.filter(s => s !== value) : [...selected, value]);
    };
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-10">
                    <div className="flex gap-1 flex-wrap">
                         {selected.length > 0 ? selected.map(v => <Badge variant="secondary" key={v}>{options.find(o => o.value === v)?.label || v}</Badge>) : `Seleccionar ${title.toLowerCase()}...`}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Buscar...`} />
                    <CommandList>
                        <CommandEmpty>Sin resultados.</CommandEmpty>
                        <CommandGroup>
                            {options.map((opt) => (
                                <CommandItem key={opt.value} value={opt.label} onSelect={() => handleSelect(opt.value)}>
                                    <Check className={cn("mr-2 h-4 w-4", selected.includes(opt.value) ? "opacity-100" : "opacity-0")} />
                                    {opt.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export function ClassesReportTab({ context = 'asistencia' }: { context?: 'asistencia' | 'aspirantes' }) {
    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterHierarchy, setFilterHierarchy] = useState<string[]>([]);
    const [filterStation, setFilterStation] = useState<string[]>([]);
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
    const [openCombobox, setOpenCombobox] = useState(false);
    const [excludeInstructor, setExcludeInstructor] = useState(false);

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
            if (filterDate?.from) {
                const date = parseISO(s.date);
                if (!isWithinInterval(date, { start: startOfDay(filterDate.from), end: endOfDay(filterDate.to || filterDate.from) })) return false;
            }
            return true;
        });

        filtered.forEach(s => {
            const participants = new Set([...(s.instructorIds || []), ...(s.assistantIds || []), ...(s.attendeeIds || [])]);
            participants.forEach(id => {
                const f = allFirefighters.find(ff => ff.id === id);
                if (!f || f.status === 'Inactive') return;
                if (filterFirefighter !== 'all' && f.id !== filterFirefighter) return;
                if (filterStation.length > 0 && !filterStation.includes(f.firehouse)) return;
                if (excludeInstructor && (s.instructorIds?.includes(f.id) || s.assistantIds?.includes(f.id))) return;
                
                const status = s.attendance?.[f.id] || ((s.instructorIds?.includes(f.id) || s.assistantIds?.includes(f.id)) ? 'present' : null);
                if (status) records.push({ firefighter: f, status, session: s });
            });
        });

        const counts = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as any);
        const pieData = Object.entries(counts).map(([name, value]) => ({ name: getStatusLabel(name as any), value, fill: (PIE_CHART_COLORS as any)[name] || '#ccc' }));

        return { details: records, pieData };
    }, [allSessions, allFirefighters, filterDate, filterSpecialization, filterStation, filterFirefighter, filterYear, excludeInstructor]);

    if (loading) return <Skeleton className="h-96 w-full" />;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle className="text-lg">Filtros</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Año</Label>
                        <Select value={filterYear} onValueChange={setFilterYear}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{[...new Set(allSessions.map(s => parseISO(s.date).getFullYear().toString()))].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Bombero</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-auto min-h-10 text-xs">
                                {filterFirefighter !== 'all' ? `${allFirefighters.find(f => f.id === filterFirefighter)?.legajo} - ${allFirefighters.find(f => f.id === filterFirefighter)?.lastName}` : "Todos"}
                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                            </Button></PopoverTrigger>
                            <PopoverContent className="p-0"><Command><CommandInput placeholder="Buscar por legajo..." /><CommandList><CommandEmpty>No hay resultados.</CommandEmpty><CommandItem onSelect={() => {setFilterFirefighter('all'); setOpenCombobox(false);}}>Todos</CommandItem>{allFirefighters.map(f => <CommandItem key={f.id} onSelect={() => {setFilterFirefighter(f.id); setOpenCombobox(false);}}>{f.legajo} - {f.lastName}, {f.firstName}</CommandItem>)}</CommandList></Command></PopoverContent>
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
                    <Card><CardHeader><CardTitle>Distribución</CardTitle></CardHeader><CardContent><ChartContainer config={{}} className="h-64"><ResponsiveContainer><PieChart><Pie data={reportData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>{reportData.pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Legend /><ChartTooltip content={<ChartTooltipContent hideLabel />} /></PieChart></ResponsiveContainer></ChartContainer></CardContent></Card>
                    <Card><CardHeader><CardTitle>Detalles</CardTitle></CardHeader><CardContent className="max-h-[300px] overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Legajo</TableHead><TableHead>Nombre</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{reportData.details.map((r, i) => <TableRow key={i}><TableCell>{r.firefighter.legajo}</TableCell><TableCell>{r.firefighter.lastName}</TableCell><TableCell><Badge className={getStatusClass(r.status)}>{getStatusLabel(r.status)}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
                </div>
            ) : <div className="text-center py-20 border-2 border-dashed rounded-lg">No hay datos.</div>}
        </div>
    );
}

export function WorkshopsReportTab({ context = 'asistencia' }: { context?: 'asistencia' | 'aspirantes' }) {
    return <ClassesReportTab context={context} />;
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

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Filtro de Cursos</CardTitle></CardHeader>
                <CardContent>
                    <Label>Bombero</Label>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-auto min-h-10 text-xs">
                            {filterFirefighter !== 'all' ? `${allFirefighters.find(f => f.id === filterFirefighter)?.legajo} - ${allFirefighters.find(f => f.id === filterFirefighter)?.lastName}` : "Todos"}
                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                        </Button></PopoverTrigger>
                        <PopoverContent className="p-0"><Command><CommandInput placeholder="Buscar por legajo..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty><CommandItem onSelect={() => {setFilterFirefighter('all'); setOpenCombobox(false);}}>Todos</CommandItem>{allFirefighters.map(f => <CommandItem key={f.id} onSelect={() => {setFilterFirefighter(f.id); setOpenCombobox(false);}}>{f.legajo} - {f.lastName}, {f.firstName}</CommandItem>)}</CommandList></Command></PopoverContent>
                    </Popover>
                </CardContent>
            </Card>
            <Card><CardHeader><CardTitle>Resultados</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Legajo</TableHead><TableHead>Nombre</TableHead><TableHead>Curso</TableHead><TableHead>Lugar</TableHead></TableRow></TableHeader><TableBody>{filtered.map(c => <TableRow key={c.id}><TableCell>{c.firefighterLegajo}</TableCell><TableCell>{c.firefighterName}</TableCell><TableCell>{c.title}</TableCell><TableCell>{c.location}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        </div>
    );
}
