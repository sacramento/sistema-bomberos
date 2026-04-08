
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar as CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown, Download, Loader2, Filter, Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Firefighter, Session, AttendanceStatus, Course, Specialization } from "@/lib/types";
import { getSessions } from "@/services/sessions.service";
import { getAspiranteSessions } from "@/services/aspirantes-sessions.service";
import { getWorkshops } from "@/services/workshops.service";
import { getAspiranteWorkshops } from "@/services/aspirantes-workshops.service";
import { getCourses } from "@/services/courses.service";
import { getFirefighters } from "@/services/firefighters.service";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { APP_CONFIG } from "@/lib/config";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";

const PIE_CHART_COLORS = {
    present: "#22C55E",
    absent: "#EF4444",
    tardy: "#FBBF24",
};

const firehouses = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'GENERAL'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (!percent || percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[11px] font-bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const getStatusLabel = (status: AttendanceStatus) => {
    switch(status) {
        case 'present': return "Presente";
        case 'recupero': return "Recuperó";
        case 'absent': return "Ausente";
        case 'tardy': return "Tarde";
        case 'excused': return "Justificado";
        default: return "N/A";
    }
}

const getPercentageColor = (pct: number) => {
    if (pct >= 70) return "bg-emerald-500 text-white";
    if (pct >= 60) return "bg-amber-500 text-amber-950";
    return "bg-rose-500 text-white";
};

const getStatusBadgeClass = (status: AttendanceStatus) => {
    switch (status) {
        case "present":
        case "recupero": return "bg-green-600 text-white";
        case "absent": return "bg-red-600 text-white";
        case "tardy": return "bg-yellow-500 text-black";
        case "excused": return "bg-violet-600 text-white";
        default: return "";
    }
}

const getSessionGroup = (session: Session) => {
    const attendees = session.attendees || [];
    if (attendees.length === 0) return 'General';

    const total = attendees.length;
    const suboficialRanks = new Set(['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR', 'OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL']);
    
    const aspirantesCount = attendees.filter(a => a.rank === 'ASPIRANTE').length;
    const officersCount = attendees.filter(a => suboficialRanks.has(a.rank)).length;

    const firehouseCounts: Record<string, number> = { 'Cuartel 1': 0, 'Cuartel 2': 0, 'Cuartel 3': 0 };
    attendees.forEach(a => {
        if (firehouseCounts.hasOwnProperty(a.firehouse)) firehouseCounts[a.firehouse]++;
    });

    if (aspirantesCount / total > 0.8) return 'Aspirantes';
    if (officersCount / total > 0.8) return 'Suboficiales';
    
    const hasC1 = firehouseCounts['Cuartel 1'] > 0;
    const hasC2 = firehouseCounts['Cuartel 2'] > 0;
    const hasC3 = firehouseCounts['Cuartel 3'] > 0;
    if (hasC1 && hasC2 && hasC3) return 'General';

    if (firehouseCounts['Cuartel 1'] / total > 0.6) return 'Cuartel 1';
    if (firehouseCounts['Cuartel 2'] / total > 0.6) return 'Cuartel 2';
    if (firehouseCounts['Cuartel 3'] / total > 0.6) return 'Cuartel 3';

    return 'General';
};

type AttendanceStats = {
    firefighter: Firefighter;
    total: number;
    present: number; // Suma de Presente + Recupero
    absent: number;  // Suma de Ausente + Justificado
    tardy: number;   // Tarde (vale 0.5)
    percentage: number;
};

type SortConfig = {
    key: 'legajo' | 'name' | 'present' | 'absent' | 'tardy' | 'percentage';
    direction: 'asc' | 'desc';
};

export function ClassesReportTab({ context = 'asistencia' }: { context?: 'asistencia' | 'aspirantes' }) {
    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);
    const isLimited = activeRole === 'Bombero';

    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
    const [filterFirehouse, setFilterFirehouse] = useState('all');
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [filterHierarchy, setFilterHierarchy] = useState<'all' | 'bomberos' | 'oficiales'>('all');
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterRole, setFilterRole] = useState<'all' | 'student' | 'staff'>('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'percentage', direction: 'desc' });
    const [viewMode, setViewMode] = useState<'totals' | 'by-class'>('totals');
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

                if (isLimited && user) {
                    const me = firefightersData.find(f => f.legajo === user.id);
                    if (me) setFilterFirefighter(me.id);
                }
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
    }, [context, toast, isLimited, user]);

    const availableYears = useMemo(() => {
        const years = new Set(allSessions.map(s => parseISO(s.date).getFullYear().toString()));
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [allSessions]);

    const { stats, pieData, sessionsByGroup, filteredIndividualSessions } = useMemo(() => {
        const statsMap = new Map<string, AttendanceStats>();
        const groupCounts = { C1: 0, C2: 0, C3: 0, General: 0, Suboficiales: 0, Aspirantes: 0 };
        const individualMatches: Session[] = [];

        allSessions.forEach(s => {
            const sDate = parseISO(s.date);
            if (filterYear !== 'all' && sDate.getFullYear().toString() !== filterYear) return;
            if (filterSpecialization !== 'all' && s.specialization !== filterSpecialization) return;
            if (filterDate?.from) {
                const toDate = filterDate.to || filterDate.from;
                if (!isWithinInterval(sDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return;
            }

            const instructorIds = new Set(s.instructorIds || []);
            const assistantIds = new Set(s.assistantIds || []);
            const attendeeIds = new Set(s.attendeeIds || []);
            const allInvolvedIds = new Set([...instructorIds, ...assistantIds, ...attendeeIds]);
            
            let countedForGroup = false;

            allInvolvedIds.forEach(fid => {
                const f = allFirefighters.find(ff => ff.id === fid);
                // EXCLUSIÓN CRÍTICA: Solo personal activo
                if (!f || f.status === 'Inactive') return;

                if (isLimited && user && f.legajo !== user.id) return;
                if (context === 'aspirantes' && f.rank !== 'ASPIRANTE') return;
                if (filterFirehouse !== 'all' && f.firehouse !== filterFirehouse) return;
                if (filterFirefighter !== 'all' && f.id !== filterFirefighter) return;

                if (filterHierarchy !== 'all') {
                    const suboficialRanks = new Set(['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR', 'OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL']);
                    const isOfficer = suboficialRanks.has(f.rank);
                    if (filterHierarchy === 'bomberos' && isOfficer) return;
                    if (filterHierarchy === 'oficiales' && !isOfficer) return;
                }

                const isStaff = instructorIds.has(fid) || assistantIds.has(fid);
                const isStudent = attendeeIds.has(fid);

                if (filterRole === 'student' && !isStudent) return;
                if (filterRole === 'staff' && !isStaff) return;

                if (!countedForGroup) {
                    const group = getSessionGroup(s);
                    if (group === 'Cuartel 1') groupCounts.C1++;
                    else if (group === 'Cuartel 2') groupCounts.C2++;
                    else if (group === 'Cuartel 3') groupCounts.C3++;
                    else if (group === 'General') groupCounts.General++;
                    else if (group === 'Suboficiales') groupCounts.Suboficiales++;
                    else if (group === 'Aspirantes') groupCounts.Aspirantes++;
                    countedForGroup = true;
                }

                if (filterFirefighter !== 'all' || isLimited) {
                    individualMatches.push(s);
                }
                
                if (!statsMap.has(fid)) {
                    statsMap.set(fid, { firefighter: f, total: 0, present: 0, absent: 0, tardy: 0, percentage: 0 });
                }
                const cur = statsMap.get(fid)!;
                cur.total++;

                if (isStaff) {
                    cur.present++; 
                } else {
                    const status = (s.attendance?.[fid] || 'present') as AttendanceStatus;
                    if (status === 'present' || status === 'recupero') cur.present++;
                    else if (status === 'absent' || status === 'excused') cur.absent++;
                    else if (status === 'tardy') cur.tardy++;
                }
            });
        });

        const statsArray = Array.from(statsMap.values()).map(s => {
            s.percentage = s.total > 0 ? ((s.present + (s.tardy * 0.5)) / s.total) * 100 : 0;
            return s;
        });

        statsArray.sort((a, b) => {
            const dir = sortConfig.direction === 'asc' ? 1 : -1;
            let aVal: any, bVal: any;
            switch (sortConfig.key) {
                case 'legajo': aVal = a.firefighter.legajo; bVal = b.firefighter.legajo; break;
                case 'name': aVal = a.firefighter.lastName; bVal = b.firefighter.lastName; break;
                case 'present': aVal = a.present; bVal = b.present; break;
                case 'absent': aVal = a.absent; bVal = b.absent; break;
                case 'tardy': aVal = a.tardy; bVal = b.tardy; break;
                case 'percentage': aVal = a.percentage; bVal = b.percentage; break;
                default: return 0;
            }
            return aVal < bVal ? -1 * dir : aVal > bVal ? 1 * dir : 0;
        });

        const globalCounts = statsArray.reduce((acc, s) => {
            acc.present += s.present; acc.absent += s.absent; acc.tardy += s.tardy;
            return acc;
        }, { present: 0, absent: 0, tardy: 0 });

        const pData = [
            { name: 'Presente', value: globalCounts.present, fill: PIE_CHART_COLORS.present },
            { name: 'Ausente', value: globalCounts.absent, fill: PIE_CHART_COLORS.absent },
            { name: 'Tarde', value: globalCounts.tardy, fill: PIE_CHART_COLORS.tardy }
        ].filter(d => d.value > 0);

        return { stats: statsArray, pieData: pData, sessionsByGroup: groupCounts, filteredIndividualSessions: individualMatches };
    }, [allSessions, filterYear, filterSpecialization, filterDate, filterFirehouse, filterFirefighter, filterHierarchy, filterRole, context, sortConfig, allFirefighters, isLimited, user]);

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
            const rangeText = filterYear === 'all' ? "Historial Completo" : `Ciclo ${filterYear}`;
            doc.text(`Período: ${rangeText}`, 14, curY); curY += 6;
            
            doc.setFont('helvetica', 'bold'); doc.setTextColor(40);
            const resLine = context === 'aspirantes' 
                ? `Oferta Académica: ${sessionsByGroup.Aspirantes} clases` 
                : `Cant. Clases - C1: ${sessionsByGroup.C1} | C2: ${sessionsByGroup.C2} | C3: ${sessionsByGroup.C3} | General: ${sessionsByGroup.General} | Subof: ${sessionsByGroup.Suboficiales}`;
            doc.text(resLine, 14, curY); curY += 10;

            const isIndividual = (filterFirefighter !== 'all' || isLimited) && stats.length === 1;
            
            if (isIndividual) {
                const s = stats[0];
                doc.setFontSize(14); doc.text(`Ficha Individual: ${s.firefighter.lastName}, ${s.firefighter.firstName}`, 14, curY); curY += 10;
                (doc as any).autoTable({
                    startY: curY, head: [['Fecha', 'Clase', 'Rol', 'Estado']],
                    body: filteredIndividualSessions.map(sess => {
                        const isStaff = sess.instructorIds?.includes(s.firefighter.id) || sess.assistantIds?.includes(s.firefighter.id);
                        return [
                            format(parseISO(sess.date), 'dd/MM/yyyy'), 
                            sess.title, 
                            isStaff ? 'Instructor' : 'Alumno',
                            isStaff ? 'Presente' : getStatusLabel(sess.attendance?.[s.firefighter.id] || 'present')
                        ];
                    }),
                    theme: 'striped', headStyles: { fillColor: '#333' }
                });
            } else {
                (doc as any).autoTable({
                    startY: curY, head: [['Integrante', 'P', 'A', 'T', '%']],
                    body: stats.map(s => [`${s.firefighter.legajo} - ${s.firefighter.lastName}, ${s.firefighter.firstName}`, s.present, s.absent, s.tardy, `${s.percentage.toFixed(0)}%`]),
                    theme: 'striped', headStyles: { fillColor: '#333' },
                    didParseCell: function (data: any) {
                        if (data.section === 'body' && data.column.index === 4) {
                            const val = parseFloat(data.cell.raw);
                            if (val >= 70) { data.cell.styles.fillColor = [16, 185, 129]; data.cell.styles.textColor = [255, 255, 255]; }
                            else if (val >= 60) { data.cell.styles.fillColor = [245, 158, 11]; data.cell.styles.textColor = [0, 0, 0]; }
                            else { data.cell.styles.fillColor = [244, 63, 94]; data.cell.styles.textColor = [255, 255, 255]; }
                        }
                    }
                });
            }
            doc.save(`reporte-clases-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingPdf(false); }
    };

    const firefighterList = allFirefighters.filter(f => f.status !== 'Inactive' && (context === 'aspirantes' ? f.rank === 'ASPIRANTE' : f.rank !== 'ASPIRANTE'));

    if (loading) return <Skeleton className="h-96 w-full" />;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5" /> Filtros de Reporte</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label>Ciclo</Label><Select value={filterYear} onValueChange={setFilterYear}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Especialidad</Label><Select value={filterSpecialization} onValueChange={setFilterSpecialization}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Cuartel</Label><Select value={filterFirehouse} onValueChange={setFilterFirehouse} disabled={isLimited}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{firehouses.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Integrante</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild disabled={isLimited}><Button variant="outline" className="w-full justify-between h-10 text-xs truncate">{filterFirefighter !== 'all' ? allFirefighters.find(f => f.id === filterFirefighter)?.lastName : "Todos"}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button></PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty><CommandGroup><CommandItem onSelect={() => {setFilterFirefighter('all'); setOpenCombobox(false);}}>Todos</CommandItem>{firefighterList.map(f => <CommandItem key={f.id} value={`${f.legajo} ${f.lastName} ${f.firstName}`} onSelect={() => {setFilterFirefighter(f.id); setOpenCombobox(false);}}>{f.legajo} - {f.lastName}, {f.firstName}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2"><Label>Jerarquía</Label><Select value={filterHierarchy} onValueChange={(v: any) => setFilterHierarchy(v)} disabled={context === 'aspirantes'}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="bomberos">Bomberos</SelectItem><SelectItem value="oficiales">Oficiales/Subof</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Rol</Label><Select value={filterRole} onValueChange={(v: any) => setFilterRole(v)}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="student">Alumno</SelectItem><SelectItem value="staff">Instructor/Ayud</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Rango Fechas</Label>
                        <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-xs h-10", !filterDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filterDate?.from ? format(filterDate.from, "P", {locale: es}) : "Historial Completo"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={filterDate?.from} selected={filterDate} onSelect={setFilterDate} locale={es} numberOfMonths={2}/></PopoverContent></Popover>
                    </div>
                    <div className="space-y-2"><Label>Modo de Vista</Label><Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="totals">Totales Acumulados</SelectItem><SelectItem value="by-class">Detalle por Sesión</SelectItem></SelectContent></Select></div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-end"><Button onClick={generatePdf} disabled={generatingPdf || stats.length === 0}>{generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>} Generar PDF</Button></CardFooter>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 shadow-md h-fit"><CardHeader className="bg-muted/20 border-b"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Distribución de Asistencia</CardTitle></CardHeader><CardContent className="h-64 pt-4"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={90} labelLine={false} label={renderCustomizedLabel} strokeWidth={2}>{pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
                <Card className="lg:col-span-2 shadow-md"><CardHeader className="bg-muted/20 border-b"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">{viewMode === 'by-class' ? 'Ficha de Actividades' : 'Resumen por Integrante'}</CardTitle></CardHeader>
                    <CardContent className="p-0"><div className="h-[450px] overflow-auto"><Table><TableHeader><TableRow>
                        {viewMode === 'by-class' ? (
                            <>
                                <TableHead className="text-[11px]">Fecha</TableHead>
                                <TableHead className="text-[11px]">Clase</TableHead>
                                <TableHead className="text-[11px]">Rol</TableHead>
                                <TableHead className="text-right text-[11px]">Estado</TableHead>
                            </>
                        ) : (
                            <>
                                <TableHead className="cursor-pointer text-[11px]" onClick={() => toggleSort('legajo')}>Legajo {getSortIcon('legajo')}</TableHead>
                                <TableHead className="cursor-pointer text-[11px]" onClick={() => toggleSort('name')}>Nombre y Apellido {getSortIcon('name')}</TableHead>
                                <TableHead className="text-center text-[11px]">P</TableHead>
                                <TableHead className="text-center text-[11px]">A</TableHead>
                                <TableHead className="text-center text-[11px]">T</TableHead>
                                <TableHead className="text-right cursor-pointer text-[11px]" onClick={() => toggleSort('percentage')}>% {getSortIcon('percentage')}</TableHead>
                            </>
                        )}
                    </TableRow></TableHeader><TableBody>
                        {viewMode === 'by-class' ? filteredIndividualSessions.map(s => {
                            const targetId = (filterFirefighter !== 'all') ? filterFirefighter : (isLimited ? stats[0]?.firefighter.id : null);
                            const isStaff = targetId ? (s.instructorIds?.includes(targetId) || s.assistantIds?.includes(targetId)) : false;
                            const status = (targetId && !isStaff) ? (s.attendance?.[targetId] || 'present') as AttendanceStatus : 'present';
                            return (
                                <TableRow key={s.id}>
                                    <TableCell className="text-[10px] whitespace-nowrap">{format(parseISO(s.date), 'dd/MM/yy')}</TableCell>
                                    <TableCell className="text-xs font-medium truncate max-w-[200px]">{s.title}</TableCell>
                                    <TableCell className="text-[10px] uppercase font-bold text-muted-foreground">{isStaff ? 'Instructor' : 'Alumno'}</TableCell>
                                    <TableCell className="text-right"><Badge className={cn("text-[9px] h-5", getStatusBadgeClass(status))}>{getStatusLabel(status)}</Badge></TableCell>
                                </TableRow>
                            );
                        }) : stats.map(s => (
                            <TableRow key={s.firefighter.id}>
                                <TableCell className="text-[10px] font-mono">{s.firefighter.legajo}</TableCell>
                                <TableCell className="text-xs font-medium">{s.firefighter.lastName}, {s.firefighter.firstName}</TableCell>
                                <TableCell className="text-center text-xs">{s.present}</TableCell>
                                <TableCell className="text-center text-xs">{s.absent}</TableCell>
                                <TableCell className="text-center text-xs">{s.tardy}</TableCell>
                                <TableCell className="text-right"><Badge className={cn("text-[10px] font-bold min-w-[40px] justify-center h-5", getPercentageColor(s.percentage))}>{s.percentage.toFixed(0)}%</Badge></TableCell>
                            </TableRow>
                        ))}
                    </TableBody></Table></div></CardContent></Card>
            </div>
        </div>
    );
}

export function WorkshopsReportTab({ context = 'asistencia' }: { context?: 'asistencia' | 'aspirantes' }) {
    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);
    const isLimited = activeRole === 'Bombero';

    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [allWorkshops, setAllWorkshops] = useState<Session[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterFirehouse, setFilterFirehouse] = useState('all');
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [filterHierarchy, setFilterHierarchy] = useState<'all' | 'bomberos' | 'oficiales'>('all');
    const [filterRole, setFilterRole] = useState<'all' | 'student' | 'staff'>('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'percentage', direction: 'desc' });
    const [viewMode, setViewMode] = useState<'totals' | 'by-class'>('totals');
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

                if (isLimited && user) {
                    const me = firefightersData.find(f => f.legajo === user.id);
                    if (me) setFilterFirefighter(me.id);
                }
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
    }, [context, toast, isLimited, user]);

    const availableYears = useMemo(() => {
        const years = new Set(allWorkshops.map(s => parseISO(s.date).getFullYear().toString()));
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [allWorkshops]);

    const { stats, pieData, sessionsByGroup, filteredIndividualSessions } = useMemo(() => {
        const statsMap = new Map<string, AttendanceStats>();
        const groupCounts = { C1: 0, C2: 0, C3: 0, General: 0, Suboficiales: 0, Aspirantes: 0 };
        const individualMatches: Session[] = [];

        allWorkshops.forEach(s => {
            const sDate = parseISO(s.date);
            if (filterYear !== 'all' && sDate.getFullYear().toString() !== filterYear) return;
            if (filterSpecialization !== 'all' && s.specialization !== filterSpecialization) return;
            if (filterDate?.from) {
                if (!isWithinInterval(sDate, { start: startOfDay(filterDate.from), end: endOfDay(filterDate.to || filterDate.from) })) return;
            }

            const instructorIds = new Set(s.instructorIds || []);
            const assistantIds = new Set(s.assistantIds || []);
            const attendeeIds = new Set(s.attendeeIds || []);
            const allInvolvedIds = new Set([...instructorIds, ...assistantIds, ...attendeeIds]);
            
            let countedForGroup = false;

            allInvolvedIds.forEach(fid => {
                const f = allFirefighters.find(ff => ff.id === fid);
                if (!f || f.status === 'Inactive') return;

                if (isLimited && user && f.legajo !== user.id) return;
                if (context === 'aspirantes' && f.rank !== 'ASPIRANTE') return;
                if (filterFirehouse !== 'all' && f.firehouse !== filterFirehouse) return;
                if (filterFirefighter !== 'all' && f.id !== filterFirefighter) return;

                if (filterHierarchy !== 'all') {
                    const suboficialRanks = new Set(['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR', 'OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL']);
                    const isOfficer = suboficialRanks.has(f.rank);
                    if (filterHierarchy === 'bomberos' && isOfficer) return;
                    if (filterHierarchy === 'oficiales' && !isOfficer) return;
                }

                const isStaff = instructorIds.has(fid) || assistantIds.has(fid);
                if (filterRole === 'student' && isStaff) return;
                if (filterRole === 'staff' && !isStaff) return;

                if (!countedForGroup) {
                    const group = getSessionGroup(s);
                    if (group === 'Cuartel 1') groupCounts.C1++;
                    else if (group === 'Cuartel 2') groupCounts.C2++;
                    else if (group === 'Cuartel 3') groupCounts.C3++;
                    else if (group === 'General') groupCounts.General++;
                    else if (group === 'Suboficiales') groupCounts.Suboficiales++;
                    else if (group === 'Aspirantes') groupCounts.Aspirantes++;
                    countedForGroup = true;
                }

                if (filterFirefighter !== 'all' || isLimited) {
                    individualMatches.push(s);
                }

                if (!statsMap.has(fid)) {
                    statsMap.set(fid, { firefighter: f, total: 0, present: 0, absent: 0, tardy: 0, percentage: 0 });
                }
                const cur = statsMap.get(fid)!;
                cur.total++;

                if (isStaff) {
                    cur.present++;
                } else {
                    const status = (s.attendance?.[fid] || 'present') as AttendanceStatus;
                    if (status === 'present' || status === 'recupero') cur.present++;
                    else if (status === 'absent' || status === 'excused') cur.absent++;
                    else if (status === 'tardy') cur.tardy++;
                }
            });
        });

        const statsArray = Array.from(statsMap.values()).map(s => {
            s.percentage = s.total > 0 ? ((s.present + (s.tardy * 0.5)) / s.total) * 100 : 0;
            return s;
        });

        statsArray.sort((a, b) => {
            const dir = sortConfig.direction === 'asc' ? 1 : -1;
            let aVal: any, bVal: any;
            switch (sortConfig.key) {
                case 'legajo': aVal = a.firefighter.legajo; bVal = b.firefighter.legajo; break;
                case 'name': aVal = a.firefighter.lastName; bVal = b.firefighter.lastName; break;
                case 'present': aVal = a.present; bVal = b.present; break;
                case 'absent': aVal = a.absent; bVal = b.absent; break;
                case 'tardy': aVal = a.tardy; bVal = b.tardy; break;
                case 'percentage': aVal = a.percentage; bVal = b.percentage; break;
                default: return 0;
            }
            return aVal < bVal ? -1 * dir : aVal > bVal ? 1 * dir : 0;
        });

        const globalCounts = statsArray.reduce((acc, s) => {
            acc.present += s.present; acc.absent += s.absent; acc.tardy += s.tardy;
            return acc;
        }, { present: 0, absent: 0, tardy: 0 });

        const pData = [
            { name: 'Presente', value: globalCounts.present, fill: PIE_CHART_COLORS.present },
            { name: 'Ausente', value: globalCounts.absent, fill: PIE_CHART_COLORS.absent },
            { name: 'Tarde', value: globalCounts.tardy, fill: PIE_CHART_COLORS.tardy }
        ].filter(d => d.value > 0);

        return { stats: statsArray, pieData: pData, sessionsByGroup: groupCounts, filteredIndividualSessions: individualMatches };
    }, [allWorkshops, filterYear, filterSpecialization, filterDate, filterFirehouse, filterFirefighter, filterHierarchy, filterRole, context, sortConfig, allFirefighters, isLimited, user]);

    const toggleSort = (key: SortConfig['key']) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    const getSortIcon = (key: SortConfig['key']) => sortConfig.key !== key ? <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" /> : sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;

    const generatePdf = async () => {
        if (!logoDataUrl) return;
        setGeneratingPdf(true);
        const doc = new jsPDF();
        try {
            doc.setFillColor(220, 53, 69); doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
            doc.text(`Reporte de Talleres - ${APP_CONFIG.name}`, 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25);
            
            let curY = 45; doc.setFontSize(10); doc.setTextColor(100);
            const rangeText = filterYear === 'all' ? "Historial Completo" : `Ciclo ${filterYear}`;
            doc.text(`Período: ${rangeText}`, 14, curY); curY += 6;

            doc.setFont('helvetica', 'bold'); doc.setTextColor(40);
            const resLine = context === 'aspirantes' 
                ? `Oferta Académica: ${sessionsByGroup.Aspirantes} talleres` 
                : `Cant. Talleres - C1: ${sessionsByGroup.C1} | C2: ${sessionsByGroup.C2} | C3: ${sessionsByGroup.C3} | General: ${sessionsByGroup.General} | Subof: ${sessionsByGroup.Suboficiales}`;
            doc.text(resLine, 14, curY); curY += 10;

            const isIndividual = (filterFirefighter !== 'all' || isLimited) && stats.length === 1;

            if (isIndividual) {
                const s = stats[0];
                doc.setFontSize(14); doc.text(`Ficha Individual: ${s.firefighter.lastName}, ${s.firefighter.firstName}`, 14, curY); curY += 10;
                (doc as any).autoTable({
                    startY: curY, head: [['Fecha', 'Taller', 'Rol', 'Estado']],
                    body: filteredIndividualSessions.map(sess => {
                        const isStaff = sess.instructorIds?.includes(s.firefighter.id) || sess.assistantIds?.includes(s.firefighter.id);
                        return [
                            format(parseISO(sess.date), 'dd/MM/yyyy'), 
                            sess.title, 
                            isStaff ? 'Instructor' : 'Alumno',
                            isStaff ? 'Presente' : getStatusLabel(sess.attendance?.[s.firefighter.id] || 'present')
                        ];
                    }),
                    theme: 'striped', headStyles: { fillColor: '#333' }
                });
            } else {
                (doc as any).autoTable({
                    startY: curY, head: [['Integrante', 'P', 'A', 'T', '%']],
                    body: stats.map(s => [`${s.firefighter.legajo} - ${s.firefighter.lastName}, ${s.firefighter.firstName}`, s.present, s.absent, s.tardy, `${s.percentage.toFixed(0)}%`]),
                    theme: 'striped', headStyles: { fillColor: '#333' },
                    didParseCell: function (data: any) {
                        if (data.section === 'body' && data.column.index === 4) {
                            const val = parseFloat(data.cell.raw);
                            if (val >= 70) { data.cell.styles.fillColor = [16, 185, 129]; data.cell.styles.textColor = [255, 255, 255]; }
                            else if (val >= 60) { data.cell.styles.fillColor = [245, 158, 11]; data.cell.styles.textColor = [0, 0, 0]; }
                            else { data.cell.styles.fillColor = [244, 63, 94]; data.cell.styles.textColor = [255, 255, 255]; }
                        }
                    }
                });
            }
            doc.save(`reporte-talleres-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingPdf(false); }
    };

    const firefighterList = allFirefighters.filter(f => f.status !== 'Inactive' && (context === 'aspirantes' ? f.rank === 'ASPIRANTE' : f.rank !== 'ASPIRANTE'));

    if (loading) return <Skeleton className="h-96 w-full" />;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5" /> Filtros de Taller</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label>Ciclo</Label><Select value={filterYear} onValueChange={setFilterYear}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Especialidad</Label><Select value={filterSpecialization} onValueChange={setFilterSpecialization}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Cuartel</Label><Select value={filterFirehouse} onValueChange={setFilterFirehouse} disabled={isLimited}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{firehouses.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Integrante</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild disabled={isLimited}><Button variant="outline" className="w-full justify-between h-10 text-xs truncate">{filterFirefighter !== 'all' ? allFirefighters.find(f => f.id === filterFirefighter)?.lastName : "Todos"}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button></PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty><CommandGroup><CommandItem onSelect={() => {setFilterFirefighter('all'); setOpenCombobox(false);}}>Todos</CommandItem>{firefighterList.map(f => <CommandItem key={f.id} value={`${f.legajo} ${f.lastName} ${f.firstName}`} onSelect={() => {setFilterFirefighter(f.id); setOpenCombobox(false);}}>{f.legajo} - {f.lastName}, {f.firstName}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2"><Label>Jerarquía</Label><Select value={filterHierarchy} onValueChange={(v: any) => setFilterHierarchy(v)} disabled={context === 'aspirantes'}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="bomberos">Bomberos</SelectItem><SelectItem value="oficiales">Oficiales/Subof</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Rol</Label><Select value={filterRole} onValueChange={(v: any) => setFilterRole(v)}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="student">Alumno</SelectItem><SelectItem value="staff">Instructor/Ayud</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Rango Fechas</Label>
                        <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-xs h-10", !filterDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filterDate?.from ? format(filterDate.from, "P", {locale: es}) : "Historial Completo"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={filterDate?.from} selected={filterDate} onSelect={setFilterDate} locale={es} numberOfMonths={2}/></PopoverContent></Popover>
                    </div>
                    <div className="space-y-2"><Label>Vista</Label><Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="totals">Resumen</SelectItem><SelectItem value="by-class">Detalle Sesiones</SelectItem></SelectContent></Select></div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-end"><Button onClick={generatePdf} disabled={generatingPdf || stats.length === 0}>{generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>} Exportar PDF</Button></CardFooter>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 shadow-md h-fit"><CardHeader className="bg-muted/20 border-b"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Distribución</CardTitle></CardHeader><CardContent className="h-64 pt-4"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={90} labelLine={false} label={renderCustomizedLabel} strokeWidth={2}>{pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
                <Card className="lg:col-span-2 shadow-md"><CardHeader className="bg-muted/20 border-b"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">{viewMode === 'by-class' ? 'Detalle Individual' : 'Resumen por Integrante'}</CardTitle></CardHeader>
                    <CardContent className="p-0"><div className="h-[450px] overflow-auto"><Table><TableHeader><TableRow>
                        {viewMode === 'by-class' ? (
                            <>
                                <TableHead className="text-[11px]">Fecha</TableHead>
                                <TableHead className="text-[11px]">Taller</TableHead>
                                <TableHead className="text-[11px]">Rol</TableHead>
                                <TableHead className="text-right text-[11px]">Estado</TableHead>
                            </>
                        ) : (
                            <>
                                <TableHead className="cursor-pointer text-[11px]" onClick={() => toggleSort('legajo')}>Legajo {getSortIcon('legajo')}</TableHead>
                                <TableHead className="cursor-pointer text-[11px]" onClick={() => toggleSort('name')}>Apellido y Nombre {getSortIcon('name')}</TableHead>
                                <TableHead className="text-center text-[11px]">P</TableHead>
                                <TableHead className="text-center text-[11px]">A</TableHead>
                                <TableHead className="text-center text-[11px]">T</TableHead>
                                <TableHead className="text-right cursor-pointer text-[11px]" onClick={() => toggleSort('percentage')}>% {getSortIcon('percentage')}</TableHead>
                            </>
                        )}
                    </TableRow></TableHeader><TableBody>
                        {viewMode === 'by-class' ? filteredIndividualSessions.map(s => {
                            const targetId = (filterFirefighter !== 'all') ? filterFirefighter : (isLimited ? stats[0]?.firefighter.id : null);
                            const isStaff = targetId ? (s.instructorIds?.includes(targetId) || s.assistantIds?.includes(targetId)) : false;
                            const status = (targetId && !isStaff) ? (s.attendance?.[targetId] || 'present') as AttendanceStatus : 'present';
                            return (
                                <TableRow key={s.id}>
                                    <TableCell className="text-[10px] whitespace-nowrap">{format(parseISO(s.date), 'dd/MM/yy')}</TableCell>
                                    <TableCell className="text-xs font-medium truncate max-w-[200px]">{s.title}</TableCell>
                                    <TableCell className="text-[10px] uppercase font-bold text-muted-foreground">{isStaff ? 'Instructor' : 'Alumno'}</TableCell>
                                    <TableCell className="text-right"><Badge className={cn("text-[9px] h-5", getStatusBadgeClass(status))}>{getStatusLabel(status)}</Badge></TableCell>
                                </TableRow>
                            );
                        }) : stats.map(s => (
                            <TableRow key={s.firefighter.id}>
                                <TableCell className="text-[10px] font-mono">{s.firefighter.legajo}</TableCell>
                                <TableCell className="text-xs font-medium">{s.firefighter.lastName}, {s.firefighter.firstName}</TableCell>
                                <TableCell className="text-center text-xs">{s.present}</TableCell>
                                <TableCell className="text-center text-xs">{s.absent}</TableCell>
                                <TableCell className="text-center text-xs">{s.tardy}</TableCell>
                                <TableCell className="text-right"><Badge className={cn("text-[10px] font-bold min-w-[40px] justify-center h-5", getPercentageColor(s.percentage))}>{s.percentage.toFixed(0)}%</Badge></TableCell>
                            </TableRow>
                        ))}
                    </TableBody></Table></div></CardContent></Card>
            </div>
        </div>
    );
}

export function CoursesReportTab({ context = 'asistencia' }: { context?: 'asistencia' | 'aspirantes' }) {
    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);
    const isLimited = activeRole === 'Bombero';

    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name' as any, direction: 'asc' });
    
    const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [filterFirehouse, setFilterFirehouse] = useState('all');
    const [openCombobox, setOpenCombobox] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [cData, fData] = await Promise.all([getCourses(), getFirefighters()]);
                setAllFirefighters(fData);
                
                let relevantCourses = cData;
                if (context === 'aspirantes') {
                    const aspIds = new Set(fData.filter(f => f.rank === 'ASPIRANTE').map(f => f.id));
                    relevantCourses = cData.filter(c => aspIds.has(c.firefighterId));
                } else {
                    const nonAspIds = new Set(fData.filter(f => f.rank !== 'ASPIRANTE').map(f => f.id));
                    relevantCourses = cData.filter(c => nonAspIds.has(c.firefighterId));
                }

                if (isLimited && user) {
                    const me = fData.find(f => f.legajo === user.id);
                    if (me) {
                        setFilterFirefighter(me.id);
                        relevantCourses = relevantCourses.filter(c => c.firefighterId === me.id);
                    }
                }
                setAllCourses(relevantCourses);
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
    }, [context, toast, isLimited, user]);

    const availableYears = useMemo(() => {
        const years = new Set(allCourses.map(c => parseISO(c.startDate).getFullYear().toString()));
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [allCourses]);

    const filtered = useMemo(() => {
        let res = allCourses.filter(c => {
            const f = allFirefighters.find(ff => ff.id === c.firefighterId);
            if (!f || f.status === 'Inactive') return false;

            if (filterYear !== 'all' && parseISO(c.startDate).getFullYear().toString() !== filterYear) return false;
            if (filterSpecialization !== 'all' && c.specialization !== filterSpecialization) return false;
            if (filterFirefighter !== 'all' && c.firefighterId !== filterFirefighter) return false;
            if (filterFirehouse !== 'all' && f.firehouse !== filterFirehouse) return false;
            return true;
        });
        res.sort((a, b) => {
            const dir = sortConfig.direction === 'asc' ? 1 : -1;
            const aVal = sortConfig.key === 'name' ? a.firefighterName : a.startDate;
            const bVal = sortConfig.key === 'name' ? b.firefighterName : b.startDate;
            return aVal < bVal ? -1 * dir : aVal > bVal ? 1 * dir : 0;
        });
        return res;
    }, [allCourses, filterYear, filterSpecialization, filterFirefighter, filterFirehouse, allFirefighters, sortConfig]);

    const generatePdf = async () => {
        if (!logoDataUrl) return;
        setGeneratingPdf(true);
        const doc = new jsPDF();
        try {
            doc.setFillColor(220, 53, 69); doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
            doc.text(`Cursos Externos - ${APP_CONFIG.name}`, 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25);
            
            let curY = 45; doc.setFontSize(10); doc.setTextColor(100);
            const rangeText = filterYear === 'all' ? "Historial Completo" : `Ciclo ${filterYear}`;
            doc.text(`Período: ${rangeText}`, 14, curY); curY += 15;

            (doc as any).autoTable({
                startY: curY, head: [['Integrante', 'Curso', 'Lugar', 'Fecha']],
                body: filtered.map(c => [`${c.firefighterLegajo} - ${c.firefighterName}`, c.title, c.location, format(parseISO(c.startDate), 'dd/MM/yyyy')]),
                theme: 'striped', headStyles: { fillColor: '#333' }
            });
            doc.save(`reporte-cursos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingPdf(false); }
    };

    const firefighterList = allFirefighters.filter(f => f.status !== 'Inactive' && (context === 'aspirantes' ? f.rank === 'ASPIRANTE' : f.rank !== 'ASPIRANTE'));

    return (
        <div className="space-y-6">
            <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5" /> Filtros de Cursos</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label>Ciclo Lectivo</Label><Select value={filterYear} onValueChange={setFilterYear}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Especialidad</Label><Select value={filterSpecialization} onValueChange={setFilterSpecialization}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Cuartel</Label><Select value={filterFirehouse} onValueChange={setFilterFirehouse} disabled={isLimited}><SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{firehouses.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Integrante</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild disabled={isLimited}><Button variant="outline" className="w-full justify-between h-10 text-xs truncate">{filterFirefighter !== 'all' ? allFirefighters.find(f => f.id === filterFirefighter)?.lastName : "Todos"}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button></PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty><CommandGroup><CommandItem onSelect={() => {setFilterFirefighter('all'); setOpenCombobox(false);}}>Todos</CommandItem>{firefighterList.map(f => <CommandItem key={f.id} value={`${f.legajo} ${f.lastName} ${f.firstName}`} onSelect={() => {setFilterFirefighter(f.id); setOpenCombobox(false);}}>{f.legajo} - {f.lastName}, {f.firstName}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-end"><Button onClick={generatePdf} disabled={generatingPdf || filtered.length === 0}>{generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>} Exportar PDF</Button></CardFooter>
            </Card>
            <Card><CardContent className="p-0"><div className="h-[450px] overflow-auto"><Table><TableHeader><TableRow><TableHead className="text-[11px]">Nombre y Apellido</TableHead><TableHead className="text-[11px]">Título del Curso</TableHead><TableHead className="text-[11px]">Lugar</TableHead><TableHead className="text-right text-[11px]">Fecha</TableHead></TableRow></TableHeader><TableBody>{filtered.map(c => (<TableRow key={c.id}><TableCell className="text-xs font-medium">{c.firefighterName}</TableCell><TableCell className="text-xs">{c.title}</TableCell><TableCell className="text-xs">{c.location}</TableCell><TableCell className="text-right text-[10px] font-mono whitespace-nowrap">{format(parseISO(c.startDate), 'dd/MM/yyyy')}</TableCell></TableRow>))}</TableBody></Table></div></CardContent></Card>
        </div>
    );
}
