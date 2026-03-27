
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar as CalendarIcon, UserCheck, UserX, Clock, ShieldAlert, Percent, GraduationCap, Users, Check, ChevronsUpDown, BarChart3, ListFilter, LayoutGrid, Download, Loader2, List, ArrowUpDown, ArrowUp, ArrowDown, Filter, UserCog } from "lucide-react";
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
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { APP_CONFIG } from "@/lib/config";

const PIE_CHART_COLORS = {
    present: "#22C55E",
    absent: "#EF4444",
    tardy: "#FBBF24",
    excused: "#8B5CF6",
    recupero: "#3B82F6",
};

const attendanceStatusOptions = [
    { value: 'present', label: 'Presente' },
    { value: 'absent', label: 'Ausente' },
    { value: 'tardy', label: 'Tarde' },
    { value: 'excused', label: 'Justificado' },
    { value: 'recupero', label: 'Recuperó' },
];

const hierarchyGroups = [
    { id: 'aspirantes', label: 'Aspirantes', ranks: ['ASPIRANTE'] },
    { id: 'bomberos', label: 'Bomberos', ranks: ['BOMBERO', 'ADAPTACION'] },
    { id: 'suboficiales_oficiales', label: 'Oficiales y Suboficiales', ranks: ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR', 'OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'] }
];

const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'GENERAL'];
const firehouses = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

const getStatusLabel = (status: AttendanceStatus) => {
    const labels: Record<AttendanceStatus, string> = { present: "Presente", absent: "Ausente", tardy: "Tarde", excused: "Justificado", recupero: "Recuperó" };
    return labels[status] || "N/A";
}

const getStatusBadgeClass = (status: AttendanceStatus) => {
    switch (status) {
        case "present": return "bg-green-600 text-white";
        case "absent": return "bg-red-600 text-white";
        case "tardy": return "bg-yellow-500 text-black";
        case "excused": return "bg-violet-600 text-white";
        case "recupero": return "bg-blue-600 text-white";
        default: return "";
    }
}

const getPercentageColor = (pct: number) => {
    if (pct >= 70) return "bg-emerald-500 text-white";
    if (pct >= 60) return "bg-amber-500 text-amber-950";
    return "bg-rose-500 text-white";
};

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

type SortConfig = {
    key: 'legajo' | 'name' | 'present' | 'absent' | 'tardy' | 'percentage' | 'date' | 'title';
    direction: 'asc' | 'desc';
};

function ScrollArea({ className, children }: { className?: string, children: React.ReactNode }) {
    return <div className={cn("relative overflow-auto", className)}>{children}</div>;
}

const MultiSelectFilter = ({ 
    title, 
    options, 
    selected, 
    onSelectedChange, 
    searchPlaceholder 
}: { 
    title: string; 
    options: { value: string; label: string }[]; 
    selected: string[]; 
    onSelectedChange: (selected: string[]) => void; 
    searchPlaceholder?: string; 
}) => {
    const [open, setOpen] = useState(false);
    const handleSelect = (value: string) => {
        const isSelected = selected.includes(value);
        onSelectedChange(isSelected ? selected.filter(s => s !== value) : [...selected, value]);
    };
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-10 text-xs text-left">
                    <div className="flex gap-1 flex-wrap">
                         {selected.length > 0 ? selected.map(v => (
                             <Badge variant="secondary" key={v} className="text-[10px] py-0 px-1">
                                 {options.find(o => o.value === v)?.label || v}
                             </Badge>
                         )) : `Filtrar ${title.toLowerCase()}...`}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder || `Buscar...`} />
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
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterFirehouse, setFilterFirehouse] = useState('all');
    const [filterHierarchy, setFilterHierarchy] = useState('all');
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
    const [filterParticipation, setFilterParticipation] = useState<'alumno' | 'todos'>('todos');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'percentage', direction: 'desc' });
    const [viewMode, setViewMode] = useState<'totals' | 'percentages' | 'by-class'>('totals');
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
                toast({ title: "Error", description: "Fallo al cargar datos.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        load();
        fetch(APP_CONFIG.logoUrl).then(r => r.blob()).then(b => {
            const reader = new FileReader();
            reader.onloadend = () => setLogoDataUrl(reader.result as string);
            reader.readAsDataURL(b);
        });
    }, [context, toast]);

    const { filteredSessions, stats, pieData } = useMemo(() => {
        const filtered = allSessions.filter(s => {
            if (filterSpecialization !== 'all' && s.specialization !== filterSpecialization) return false;
            if (filterDate?.from) {
                const sDate = parseISO(s.date);
                const toDate = filterDate.to || filterDate.from;
                if (!isWithinInterval(sDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return false;
            }
            return true;
        });

        if (viewMode === 'by-class') {
            filtered.sort((a, b) => {
                let aVal: any;
                let bVal: any;
                if (sortConfig.key === 'date') { aVal = parseISO(a.date).getTime(); bVal = parseISO(b.date).getTime(); }
                else if (sortConfig.key === 'title') { aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); }
                else { aVal = parseISO(a.date).getTime(); bVal = parseISO(b.date).getTime(); }
                const dir = sortConfig.direction === 'asc' ? 1 : -1;
                return aVal < bVal ? -1 * dir : aVal > bVal ? 1 * dir : 0;
            });
        }

        const statsMap = new Map<string, AttendanceStats>();
        filtered.forEach(s => {
            const participants: { f: Firefighter, status: AttendanceStatus }[] = [];
            s.attendees.forEach(f => { participants.push({ f, status: (s.attendance?.[f.id] || 'present') as AttendanceStatus }); });
            if (filterParticipation === 'todos') {
                s.instructors.forEach(f => { if (!participants.some(p => p.f.id === f.id)) participants.push({ f, status: 'present' }); });
                s.assistants.forEach(f => { if (!participants.some(p => p.f.id === f.id)) participants.push({ f, status: 'present' }); });
            }
            participants.forEach(({ f, status }) => {
                if (context === 'aspirantes' && f.rank !== 'ASPIRANTE') return;
                if (filterFirehouse !== 'all' && f.firehouse !== filterFirehouse) return;
                if (filterHierarchy !== 'all') { const g = hierarchyGroups.find(g => g.id === filterHierarchy); if (!g?.ranks.includes(f.rank)) return; }
                if (filterFirefighter !== 'all' && f.id !== filterFirefighter) return;
                if (filterStatuses.length > 0 && !filterStatuses.includes(status)) return;
                if (!statsMap.has(f.id)) statsMap.set(f.id, { firefighter: f, total: 0, present: 0, absent: 0, tardy: 0, excused: 0, recupero: 0, percentage: 0 });
                const cur = statsMap.get(f.id)!; cur.total++;
                if (status === 'present') cur.present++; else if (status === 'absent') cur.absent++; else if (status === 'tardy') cur.tardy++; else if (status === 'excused') cur.excused++; else if (status === 'recupero') cur.recupero++;
            });
        });

        let statsArray = Array.from(statsMap.values()).map(s => {
            s.percentage = s.total > 0 ? ((s.present + s.recupero + (s.tardy * 0.5)) / s.total) * 100 : 0;
            return s;
        });

        if (viewMode !== 'by-class') {
            statsArray.sort((a, b) => {
                let aVal: any, bVal: any;
                switch (sortConfig.key) {
                    case 'legajo': aVal = a.firefighter.legajo; bVal = b.firefighter.legajo; break;
                    case 'name': aVal = a.firefighter.lastName; bVal = b.firefighter.lastName; break;
                    case 'present': aVal = a.present + a.recupero; bVal = b.present + b.recupero; break;
                    case 'absent': aVal = a.absent; bVal = b.absent; break;
                    case 'tardy': aVal = a.tardy; bVal = b.tardy; break;
                    case 'percentage': aVal = a.percentage; bVal = b.percentage; break;
                    default: return 0;
                }
                const dir = sortConfig.direction === 'asc' ? 1 : -1;
                return aVal < bVal ? -1 * dir : aVal > bVal ? 1 * dir : 0;
            });
        }

        const pData = Object.entries(statsArray.reduce((acc, s) => { acc.present += s.present; acc.absent += s.absent; acc.tardy += s.tardy; acc.excused += s.excused; acc.recupero += s.recupero; return acc; }, { present: 0, absent: 0, tardy: 0, excused: 0, recupero: 0 }))
            .map(([name, value]) => ({ name: getStatusLabel(name as any), value, fill: (PIE_CHART_COLORS as any)[name] || '#ccc' })).filter(d => d.value > 0);

        return { filteredSessions: filtered, stats: statsArray, pieData: pData };
    }, [allSessions, filterSpecialization, filterDate, filterFirehouse, filterHierarchy, filterFirefighter, filterStatuses, filterParticipation, context, sortConfig, viewMode, allFirefighters]);

    const toggleSort = (key: SortConfig['key']) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    const getSortIcon = (key: SortConfig['key']) => sortConfig.key !== key ? <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" /> : sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;

    const generatePdf = async () => {
        if (!logoDataUrl) return;
        setGeneratingPdf(true);
        const doc = new jsPDF();
        try {
            doc.setFillColor(220, 53, 69); doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
            doc.text(`Reporte de Asistencia - ${APP_CONFIG.name}`, 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25);

            let curY = 45; doc.setFontSize(10); doc.setTextColor(100);
            doc.text(filterDate?.from ? `Período: ${format(filterDate.from, "P", { locale: es })} - ${format(filterDate.to || filterDate.from, "P", { locale: es })}` : "Historial Completo", 14, curY); curY += 15;
            
            (doc as any).autoTable({
                startY: curY, head: [['Integrante', 'Presentes', 'Ausentes', 'Recuperos', 'Tasa %']],
                body: stats.map(s => [`${s.firefighter.legajo} - ${s.firefighter.lastName}`, s.present, s.absent, s.recupero, `${s.percentage.toFixed(0)}%`]),
                theme: 'striped', headStyles: { fillColor: '#333' },
                didParseCell: (data: any) => {
                    if (data.section === 'body' && data.column.index === 4) {
                        const pct = parseFloat(data.cell.text[0].replace('%', ''));
                        if (!isNaN(pct)) data.cell.styles.textColor = pct >= 70 ? [16, 185, 129] : pct >= 60 ? [245, 158, 11] : [244, 63, 94];
                    }
                }
            });
            doc.save(`reporte-asistencia-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingPdf(false); }
    };

    const firefighterList = allFirefighters.filter(f => context === 'aspirantes' ? f.rank === 'ASPIRANTE' : f.rank !== 'ASPIRANTE');

    return (
        <div className="space-y-6">
            <Card><CardHeader><div className="flex justify-between items-center"><CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5" /> Filtros</CardTitle></div></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label>Período</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-xs h-10"><CalendarIcon className="mr-2 h-4 w-4" />{filterDate?.from ? format(filterDate.from, "P", {locale: es}) : "Cualquier fecha"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={filterDate?.from} selected={filterDate} onSelect={setFilterDate} locale={es} numberOfMonths={2}/></PopoverContent></Popover></div>
                    <div className="space-y-2"><Label>Cuartel</Label><Select value={filterFirehouse} onValueChange={setFilterFirehouse}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{firehouses.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Integrante</Label><Popover open={openCombobox} onOpenChange={setOpenCombobox}><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-10 text-xs truncate">{filterFirefighter !== 'all' ? allFirefighters.find(f => f.id === filterFirefighter)?.lastName : "Todos"}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty><CommandGroup><CommandItem onSelect={() => {setFilterFirefighter('all'); setOpenCombobox(false);}}>Todos</CommandItem>{firefighterList.map(f => <CommandItem key={f.id} onSelect={() => {setFilterFirefighter(f.id); setOpenCombobox(false);}}>{f.legajo} - {f.lastName}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>
                    <div className="space-y-2"><Label>Participación</Label><Select value={filterParticipation} onValueChange={(v: any) => setFilterParticipation(v)}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todo el Personal</SelectItem><SelectItem value="alumno">Solo Alumnos</SelectItem></SelectContent></Select></div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-between items-center"><div className="flex bg-muted p-1 rounded-md gap-1"><Button variant={viewMode === 'totals' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('totals')} className="h-8 text-xs">Totales</Button><Button variant={viewMode === 'by-class' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('by-class')} className="h-8 text-xs">Sesiones</Button></div><Button onClick={generatePdf} disabled={generatingPdf || stats.length === 0}>{generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>} Exportar PDF</Button></CardFooter>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1"><CardHeader><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Distribución</CardTitle></CardHeader><CardContent className="h-64"><ResponsiveContainer><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>{pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
                <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-xs font-bold uppercase text-muted-foreground">{viewMode === 'by-class' ? 'Detalle de Sesiones' : 'Resumen por Integrante'}</CardTitle></CardHeader>
                    <CardContent className="p-0"><ScrollArea className="h-[350px]"><Table><TableHeader><TableRow>
                        {viewMode === 'by-class' ? (<><TableHead className="cursor-pointer" onClick={() => toggleSort('date')}>Fecha {getSortIcon('date')}</TableHead><TableHead className="cursor-pointer" onClick={() => toggleSort('title')}>Título {getSortIcon('title')}</TableHead><TableHead className="text-right">Asistencia</TableHead></>) : (<><TableHead className="cursor-pointer" onClick={() => toggleSort('legajo')}>Legajo {getSortIcon('legajo')}</TableHead><TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>Nombre {getSortIcon('name')}</TableHead><TableHead className="text-right cursor-pointer" onClick={() => toggleSort('percentage')}>Tasa % {getSortIcon('percentage')}</TableHead></>)}
                    </TableRow></TableHeader><TableBody>
                        {viewMode === 'by-class' ? filteredSessions.map(s => (<TableRow key={s.id}><TableCell className="text-[10px]">{format(parseISO(s.date), 'dd/MM/yy')}</TableCell><TableCell className="text-xs font-medium">{s.title}</TableCell><TableCell className="text-right"><Badge className="text-[10px]">{Object.keys(s.attendance || {}).length} presentes</Badge></TableCell></TableRow>)) : stats.map(s => (<TableRow key={s.firefighter.id}><TableCell className="text-xs font-mono">{s.firefighter.legajo}</TableCell><TableCell className="text-xs font-medium">{s.firefighter.lastName}, {s.firefighter.firstName}</TableCell><TableCell className="text-right"><Badge className={cn("text-[10px] font-bold min-w-[45px] justify-center", getPercentageColor(s.percentage))}>{s.percentage.toFixed(0)}%</Badge></TableCell></TableRow>))}
                    </TableBody></Table></ScrollArea></CardContent></Card>
            </div>
        </div>
    );
}

export function WorkshopsReportTab({ context = 'asistencia' }: { context?: 'asistencia' | 'aspirantes' }) {
    // Reutiliza la misma lógica que ClassesReportTab pero llamando a getWorkshops
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [allWorkshops, setAllWorkshops] = useState<Session[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterFirehouse, setFilterFirehouse] = useState('all');
    const [filterParticipation, setFilterParticipation] = useState<'alumno' | 'todos'>('todos');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'percentage', direction: 'desc' });
    const [viewMode, setViewMode] = useState<'totals' | 'percentages' | 'by-class'>('totals');

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
        fetch(APP_CONFIG.logoUrl).then(r => r.blob()).then(b => {
            const reader = new FileReader();
            reader.onloadend = () => setLogoDataUrl(reader.result as string);
            reader.readAsDataURL(b);
        });
    }, [context, toast]);

    const { stats, pieData } = useMemo(() => {
        const filtered = allWorkshops.filter(s => {
            if (filterDate?.from) {
                const sDate = parseISO(s.date);
                if (!isWithinInterval(sDate, { start: startOfDay(filterDate.from), end: endOfDay(filterDate.to || filterDate.from) })) return false;
            }
            return true;
        });

        const statsMap = new Map<string, AttendanceStats>();
        filtered.forEach(s => {
            const participants: { f: Firefighter, status: AttendanceStatus }[] = [];
            s.attendees.forEach(f => participants.push({ f, status: (s.attendance?.[f.id] || 'present') as AttendanceStatus }));
            if (filterParticipation === 'todos') {
                s.instructors.forEach(f => { if (!participants.some(p => p.f.id === f.id)) participants.push({ f, status: 'present' }); });
                s.assistants.forEach(f => { if (!participants.some(p => p.f.id === f.id)) participants.push({ f, status: 'present' }); });
            }
            participants.forEach(({ f, status }) => {
                if (context === 'aspirantes' && f.rank !== 'ASPIRANTE') return;
                if (filterFirehouse !== 'all' && f.firehouse !== filterFirehouse) return;
                if (!statsMap.has(f.id)) statsMap.set(f.id, { firefighter: f, total: 0, present: 0, absent: 0, tardy: 0, excused: 0, recupero: 0, percentage: 0 });
                const cur = statsMap.get(f.id)!; cur.total++;
                if (status === 'present') cur.present++; else if (status === 'absent') cur.absent++; else if (status === 'recupero') cur.recupero++;
            });
        });

        let statsArray = Array.from(statsMap.values()).map(s => {
            s.percentage = s.total > 0 ? ((s.present + s.recupero) / s.total) * 100 : 0;
            return s;
        });

        statsArray.sort((a, b) => {
            const dir = sortConfig.direction === 'asc' ? 1 : -1;
            return a.percentage < b.percentage ? -1 * dir : a.percentage > b.percentage ? 1 * dir : 0;
        });

        const pData = Object.entries(statsArray.reduce((acc, s) => { acc.present += s.present; acc.absent += s.absent; acc.recupero += s.recupero; return acc; }, { present: 0, absent: 0, recupero: 0 }))
            .map(([name, value]) => ({ name: getStatusLabel(name as any), value, fill: (PIE_CHART_COLORS as any)[name] || '#ccc' })).filter(d => d.value > 0);

        return { stats: statsArray, pieData: pData };
    }, [allWorkshops, filterDate, filterFirehouse, filterParticipation, context, sortConfig]);

    const generatePdf = async () => {
        if (!logoDataUrl) return;
        setGeneratingPdf(true);
        const doc = new jsPDF();
        try {
            doc.setFillColor(220, 53, 69); doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
            doc.text(`Reporte de Talleres - ${APP_CONFIG.name}`, 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25);
            (doc as any).autoTable({
                startY: 45, head: [['Integrante', 'Presentes', 'Ausentes', 'Recuperos', 'Tasa %']],
                body: stats.map(s => [`${s.firefighter.legajo} - ${s.firefighter.lastName}`, s.present, s.absent, s.recupero, `${s.percentage.toFixed(0)}%`]),
                theme: 'striped', headStyles: { fillColor: '#333' }
            });
            doc.save(`reporte-talleres-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingPdf(false); }
    };

    if (loading) return <Skeleton className="h-96 w-full" />;

    return (
        <div className="space-y-6">
            <Card><CardHeader><CardTitle className="text-lg">Filtros de Taller</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Período</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-xs h-10"><CalendarIcon className="mr-2 h-4 w-4" />{filterDate?.from ? format(filterDate.from, "P", {locale: es}) : "Cualquier fecha"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="range" selected={filterDate} onSelect={setFilterDate} locale={es}/></PopoverContent></Popover></div>
                    <div className="space-y-2"><Label>Cuartel</Label><Select value={filterFirehouse} onValueChange={setFilterFirehouse}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{firehouses.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Participación</Label><Select value={filterParticipation} onValueChange={(v: any) => setFilterParticipation(v)}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todo el Personal</SelectItem><SelectItem value="alumno">Solo Alumnos</SelectItem></SelectContent></Select></div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-end"><Button onClick={generatePdf} disabled={generatingPdf || stats.length === 0}>{generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>} Exportar PDF</Button></CardFooter>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1"><CardHeader><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Distribución</CardTitle></CardHeader><CardContent className="h-64"><ResponsiveContainer><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>{pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
                <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Resumen por Integrante</CardTitle></CardHeader>
                    <CardContent className="p-0"><ScrollArea className="h-[350px]"><Table><TableHeader><TableRow><TableHead>Integrante</TableHead><TableHead className="text-right">Tasa %</TableHead></TableRow></TableHeader><TableBody>
                        {stats.map(s => (<TableRow key={s.firefighter.id}><TableCell className="text-xs font-medium">{s.firefighter.lastName}, {s.firefighter.firstName}</TableCell><TableCell className="text-right"><Badge className={cn("text-[10px] font-bold", getPercentageColor(s.percentage))}>{s.percentage.toFixed(0)}%</Badge></TableCell></TableRow>))}
                    </TableBody></Table></ScrollArea></CardContent></Card>
            </div>
        </div>
    );
}

export function CoursesReportTab({ context = 'asistencia' }: { context?: 'asistencia' | 'aspirantes' }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
    
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
                toast({ title: "Error", description: "Fallo al cargar cursos.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        load();
        fetch(APP_CONFIG.logoUrl).then(r => r.blob()).then(b => {
            const reader = new FileReader();
            reader.onloadend = () => setLogoDataUrl(reader.result as string);
            reader.readAsDataURL(b);
        });
    }, [context, toast]);

    const filtered = useMemo(() => {
        let res = allCourses.filter(c => {
            if (filterFirefighter !== 'all' && c.firefighterId !== filterFirefighter) return false;
            if (filterFirehouse !== 'all') { const f = allFirefighters.find(f => f.id === c.firefighterId); if (f?.firehouse !== filterFirehouse) return false; }
            return true;
        });
        res.sort((a, b) => {
            const dir = sortConfig.direction === 'asc' ? 1 : -1;
            const aVal = sortConfig.key === 'name' ? a.firefighterName : a.startDate;
            const bVal = sortConfig.key === 'name' ? b.firefighterName : b.startDate;
            return aVal < bVal ? -1 * dir : aVal > bVal ? 1 * dir : 0;
        });
        return res;
    }, [allCourses, filterFirefighter, filterFirehouse, allFirefighters, sortConfig]);

    const generatePdf = async () => {
        if (!logoDataUrl) return;
        setGeneratingPdf(true);
        const doc = new jsPDF();
        try {
            doc.setFillColor(220, 53, 69); doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
            doc.text(`Cursos Externos - ${APP_CONFIG.name}`, 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25);
            (doc as any).autoTable({
                startY: 45, head: [['Integrante', 'Curso', 'Lugar', 'Fecha']],
                body: filtered.map(c => [`${c.firefighterLegajo} - ${c.firefighterName}`, c.title, c.location, format(parseISO(c.startDate), 'dd/MM/yyyy')]),
                theme: 'striped', headStyles: { fillColor: '#333' }
            });
            doc.save(`reporte-cursos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingPdf(false); }
    };

    const firefighterList = allFirefighters.filter(f => context === 'aspirantes' ? f.rank === 'ASPIRANTE' : f.rank !== 'ASPIRANTE');

    return (
        <div className="space-y-6">
            <Card><CardHeader><CardTitle className="text-lg">Filtros de Cursos</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Cuartel</Label><Select value={filterFirehouse} onValueChange={setFilterFirehouse}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{firehouses.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Integrante</Label><Popover open={openCombobox} onOpenChange={setOpenCombobox}><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-10 text-xs truncate">{filterFirefighter !== 'all' ? allFirefighters.find(f => f.id === filterFirefighter)?.lastName : "Todos"}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="p-0"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty><CommandGroup><CommandItem onSelect={() => {setFilterFirefighter('all'); setOpenCombobox(false);}}>Todos</CommandItem>{firefighterList.map(f => <CommandItem key={f.id} onSelect={() => {setFilterFirefighter(f.id); setOpenCombobox(false);}}>{f.legajo} - {f.lastName}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-end"><Button onClick={generatePdf} disabled={generatingPdf || filtered.length === 0}>{generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>} Exportar PDF</Button></CardFooter>
            </Card>
            <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Integrante</TableHead><TableHead>Curso</TableHead><TableHead className="text-right">Fecha</TableHead></TableRow></TableHeader><TableBody>{filtered.map(c => (<TableRow key={c.id}><TableCell className="text-xs font-medium">{c.firefighterName}</TableCell><TableCell className="text-xs">{c.title}</TableCell><TableCell className="text-right text-[10px] font-mono">{format(parseISO(c.startDate), 'dd/MM/yy')}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
        </div>
    );
}
