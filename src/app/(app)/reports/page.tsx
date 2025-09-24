
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Download, UserCheck, UserX, Clock, ShieldAlert, ChevronsUpDown, Check, Loader2, ClipboardMinus } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { es } from 'date-fns/locale';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useState, useEffect, useMemo } from "react";
import { Session, Firefighter, AttendanceStatus, Leave } from "@/lib/types";
import { getSessions } from "@/services/sessions.service";
import { getFirefighters } from "@/services/firefighters.service";
import { getLeaves } from "@/services/leaves.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";


const specializations = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE', 'VARIOS'];

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

const PIE_CHART_COLORS = {
    present: "#22C55E", // green-500
    absent: "#EF4444", // red-500
    tardy: "#FBBF24", // yellow-400
    excused: "#8B5CF6", // violet-500
    recupero: "#3B82F6", // blue-500
};

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
        if (isSelected) {
            onSelectedChange(selected.filter(s => s !== value));
        } else {
            onSelectedChange([...selected, value]);
        }
    };
    
    const selectedLabels = selected.map(s => options.find(o => o.value === s)?.label).filter(Boolean);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto"
                >
                    <div className="flex gap-1 flex-wrap">
                         {selected.length > 0 ? (
                            selectedLabels.map(label => <Badge variant="secondary" key={label}>{label}</Badge>)
                        ) : (
                            `Seleccionar ${title.toLowerCase()}...`
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Buscar ${title.toLowerCase()}...`} />
                    <CommandList>
                        <CommandEmpty>No se encontraron opciones.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => {
                                        handleSelect(option.value);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selected.includes(option.value) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};



export default function ReportsPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    // Raw Data
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [allLeaves, setAllLeaves] = useState<Leave[]>([]);

    // Filters
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterClass, setFilterClass] = useState('all');
    const [filterHierarchy, setFilterHierarchy] = useState<string[]>([]);
    const [filterStation, setFilterStation] = useState<string[]>([]);
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [openCombobox, setOpenCombobox] = useState(false);
    const [activeTab, setActiveTab] = useState("attendance");
    
    // PDF Content Switches
    const [includeSummaryInPdf, setIncludeSummaryInPdf] = useState(true);
    const [includeDetailsInPdf, setIncludeDetailsInPdf] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [sessionsData, firefightersData, leavesData] = await Promise.all([
                    getSessions(),
                    getFirefighters(),
                    getLeaves()
                ]);
                setAllSessions(sessionsData);
                setAllFirefighters(firefightersData);
                setAllLeaves(leavesData);

            } catch (error) {
                toast({ title: "Error", description: "No se pudieron cargar los datos para los reportes.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        const fetchLogo = async () => {
             try {
                const response = await fetch('https://i.ibb.co/yF0SYDNF/logo.png');
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    setLogoDataUrl(reader.result as string);
                };
                reader.readAsDataURL(blob);
             } catch (error) {
                 console.error("Failed to load logo for PDF", error);
                 toast({ title: "Advertencia", description: "No se pudo cargar el logo para el PDF.", variant: "default" });
             }
        }
        fetchData();
        fetchLogo();
    }, [toast]);
    
    const generatePdf = async () => {
        if (!logoDataUrl) {
            toast({ title: "Espere un momento", description: "El logo para el PDF aún se está cargando.", variant: "destructive" });
            return;
        }

        setGeneratingPdf(true);
        const doc = new jsPDF();
        
        try {
            // PDF Header
            doc.setFillColor(220, 53, 69); 
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text("Reporte de Asistencia", 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');

            // Date Filter Info
            doc.setFontSize(11);
            doc.setTextColor(108, 117, 125);
            doc.setFont('helvetica', 'normal');
            const dateText = filterDate?.from ? `Período: ${format(filterDate.from, "P", { locale: es })} - ${format(filterDate.to ?? filterDate.from, "P", { locale: es })}` : "Período: Todos los registros";
            doc.text(dateText, 14, 45);

            let currentY = 55;

            // Optional Summary Table
            if (includeSummaryInPdf && attendanceReportData.details.length > 0) {
                 doc.setFontSize(12);
                doc.setTextColor(40, 40, 40);
                doc.setFont('helvetica', 'bold');
                doc.text("Resumen de Asistencia por Bombero", 14, currentY);
                currentY += 8;

                const summaryByUser: Record<string, {name: string, counts: Record<AttendanceStatus, number>, total: number}> = {};
                attendanceReportData.details.forEach(item => {
                    if (!summaryByUser[item.firefighter.id]) {
                        summaryByUser[item.firefighter.id] = {
                            name: `${item.firefighter.firstName} ${item.firefighter.lastName}`,
                            counts: { present: 0, absent: 0, tardy: 0, excused: 0, recupero: 0 },
                            total: 0,
                        };
                    }
                    summaryByUser[item.firefighter.id].counts[item.status]++;
                    summaryByUser[item.firefighter.id].total++;
                });

                const summaryTableBody = Object.values(summaryByUser).map(summary => {
                    const total = summary.total;
                    const presentCount = summary.counts.present + summary.counts.recupero;
                    return [
                        summary.name,
                        summary.total,
                        `${((presentCount / total) * 100).toFixed(0)}%`,
                        `${((summary.counts.absent / total) * 100).toFixed(0)}%`,
                        `${((summary.counts.tardy / total) * 100).toFixed(0)}%`,
                        `${((summary.counts.excused / total) * 100).toFixed(0)}%`,
                    ];
                });

                 (doc as any).autoTable({
                    startY: currentY,
                    head: [['Bombero', 'Clases', '% Presente', '% Ausente', '% Tarde', '% Justificado']],
                    body: summaryTableBody,
                    theme: 'striped',
                    headStyles: { fillColor: '#333333' },
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
            }

            // Optional Details Table
            if (includeDetailsInPdf && attendanceReportData.details.length > 0) {
                doc.setFontSize(12);
                doc.setTextColor(40, 40, 40);
                doc.setFont('helvetica', 'bold');
                doc.text("Detalle de Registros de Asistencia", 14, currentY);
                currentY += 8;
                 (doc as any).autoTable({
                    startY: currentY,
                    head: [['Bombero', 'Clase', 'Especialidad', 'Fecha', 'Estado']],
                    body: attendanceReportData.details.map(item => [`${item.firefighter.firstName} ${item.firefighter.lastName}`, item.session.title, item.session.specialization, item.session.date, getStatusLabel(item.status)]),
                    theme: 'striped',
                    headStyles: { fillColor: '#333333' },
                });
            } else if (!includeSummaryInPdf) {
                 doc.text("No se seleccionó ningún contenido para incluir en el reporte.", 14, currentY);
            }

            doc.save(`reporte-asistencia-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({ title: "Error al generar PDF", description: "Hubo un problema al crear el archivo PDF.", variant: "destructive" });
        } finally {
            setGeneratingPdf(false);
        }
    };
    
    const generateLeavesPdf = async () => {
         if (!logoDataUrl) {
             toast({ title: "Espere un momento", description: "El logo para el PDF aún se está cargando.", variant: "destructive" }); return;
        }

        setGeneratingPdf(true);
        const doc = new jsPDF();
        
        try {
            doc.setFillColor(220, 53, 69); 
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text("Reporte de Licencias", 14, 22);
            
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');

            doc.setFontSize(11);
            doc.setTextColor(108, 117, 125);
            doc.setFont('helvetica', 'normal');
            const dateText = filterDate?.from ? `Período: ${format(filterDate.from, "P", { locale: es })} - ${format(filterDate.to ?? filterDate.from, "P", { locale: es })}` : "Período: Todos los registros";
            doc.text(dateText, 14, 45);

            let currentY = 55;
            
            if(leavesReportData.length > 0) {
                 (doc as any).autoTable({
                    startY: currentY,
                    head: [['Bombero', 'Tipo', 'Desde', 'Hasta']],
                    body: leavesReportData.map(item => [item.firefighterName, item.type, format(new Date(item.startDate), "PPP", { locale: es }), format(new Date(item.endDate), "PPP", { locale: es })]),
                    theme: 'striped',
                    headStyles: { fillColor: '#333333' },
                });
            }
            doc.save(`reporte-licencias-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({ title: "Error al generar PDF", description: "Hubo un problema al crear el archivo PDF.", variant: "destructive" });
        } finally {
            setGeneratingPdf(false);
        }
    }


    const attendanceReportData = useMemo(() => {
        let filteredAttendance: { firefighter: Firefighter, status: AttendanceStatus, session: Session }[] = [];
        const filteredSessions = allSessions.filter(session => {
            if (filterSpecialization !== 'all' && session.specialization !== filterSpecialization) return false;
            if (filterClass !== 'all' && session.id !== filterClass) return false;
            if (filterDate?.from) {
                 const sessionDate = new Date(session.date);
                 sessionDate.setMinutes(sessionDate.getMinutes() + sessionDate.getTimezoneOffset());
                 const toDate = filterDate.to ?? filterDate.from;
                 if (!isWithinInterval(sessionDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return false;
            }
            return true;
        });

        for (const session of filteredSessions) {
            if (session.attendance) {
                for (const firefighterId in session.attendance) {
                    const firefighter = allFirefighters.find(f => f.id === firefighterId);
                    if (firefighter) {
                        filteredAttendance.push({ firefighter, status: session.attendance[firefighterId], session });
                    }
                }
            }
        }
        
        const finalData = filteredAttendance.filter(({ firefighter }) => {
            if (filterFirefighter !== 'all' && firefighter.id !== filterFirefighter) return false;
            if (filterStation.length > 0 && !filterStation.includes(firefighter.firehouse)) return false;
            if (filterHierarchy.length > 0) {
                const suboficialRanks = ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR'];
                const oficialRanks = ['OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'];

                const hierarchyMatch = filterHierarchy.some(h => {
                    if (h === 'bomberos' && firefighter.rank === 'BOMBERO') return true;
                    if (h === 'aspirantes' && firefighter.rank === 'ASPIRANTE') return true;
                    if (h === 'suboficiales_oficiales' && [...suboficialRanks, ...oficialRanks].includes(firefighter.rank)) return true;
                    return false;
                });
                if (!hierarchyMatch) return false;
            }
            return true;
        });

        const summary = {
            present: finalData.filter(item => item.status === 'present' || item.status === 'recupero').length,
            absent: finalData.filter(item => item.status === 'absent').length,
            tardy: finalData.filter(item => item.status === 'tardy').length,
            excused: finalData.filter(item => item.status === 'excused').length,
        };
        const total = Object.values(summary).reduce((a, b) => a + b, 0);

        const pieData = Object.entries(summary)
            .filter(([, value]) => value > 0)
            .map(([name, value]) => ({ name: getStatusLabel(name as AttendanceStatus), value, fill: PIE_CHART_COLORS[name as keyof typeof PIE_CHART_COLORS] }));
            
        return { summary, total, pieData, details: finalData };
    }, [allSessions, allFirefighters, filterDate, filterSpecialization, filterClass, filterHierarchy, filterStation, filterFirefighter]);

    const leavesReportData = useMemo(() => {
        return allLeaves.filter(leave => {
            const firefighter = allFirefighters.find(f => f.id === leave.firefighterId);
            if (filterFirefighter !== 'all' && leave.firefighterId !== filterFirefighter) return false;

            if (firefighter) {
                if (filterStation.length > 0 && !filterStation.includes(firefighter.firehouse)) return false;
                if (filterHierarchy.length > 0) {
                     const suboficialRanks = ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR'];
                    const oficialRanks = ['OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'];
                    const hierarchyMatch = filterHierarchy.some(h => {
                        if (h === 'bomberos' && firefighter.rank === 'BOMBERO') return true;
                        if (h === 'aspirantes' && firefighter.rank === 'ASPIRANTE') return true;
                        if (h === 'suboficiales_oficiales' && [...suboficialRanks, ...oficialRanks].includes(firefighter.rank)) return true;
                        return false;
                    });
                    if (!hierarchyMatch) return false;
                }
            }

            if (filterDate?.from) {
                const leaveStartDate = startOfDay(new Date(leave.startDate));
                const leaveEndDate = endOfDay(new Date(leave.endDate));
                const filterStartDate = startOfDay(filterDate.from);
                const filterEndDate = endOfDay(filterDate.to ?? filterDate.from);
                if (leaveStartDate > filterEndDate || leaveEndDate < filterStartDate) return false;
            }
            return true;
        });
    }, [allLeaves, allFirefighters, filterFirefighter, filterDate, filterHierarchy, filterStation]);

    const availableClassesForFilter = useMemo(() => {
        return allSessions.map(s => ({ value: s.id, label: `${s.date} - ${s.title}` }));
    }, [allSessions]);
    
    const summaryCards = [
        { title: "Presentes", value: attendanceReportData.summary.present, icon: UserCheck, color: "text-green-500" },
        { title: "Ausentes", value: attendanceReportData.summary.absent, icon: UserX, color: "text-red-500" },
        { title: "Tardes", value: attendanceReportData.summary.tardy, icon: Clock, color: "text-yellow-500" },
        { title: "Justificados", value: attendanceReportData.summary.excused, icon: ShieldAlert, color: "text-violet-500" },
    ];
    
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent === 0) return null;

        return (
            <text x={x} y={y} fill={'#333'} textAnchor="middle" dominantBaseline="central" style={{ fontSize: '14px', fontWeight: 'bold', paintOrder: 'stroke', stroke: '#fff', strokeWidth: '3px', strokeLinecap: 'butt', strokeLinejoin: 'miter' }}>
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };
    
    const CommonFilters = () => (
         <Card className="mb-8">
            <CardHeader>
                <CardTitle className="font-headline">Filtros de Reporte</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <div className="space-y-2">
                  <Label>Rango de Fechas</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !filterDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filterDate?.from ? (filterDate.to ? (<>{format(filterDate.from, "LLL dd, y", { locale: es })} - {format(filterDate.to, "LLL dd, y", { locale: es })}</>) : (format(filterDate.from, "LLL dd, y", { locale: es }))) : (<span>Seleccionar rango</span>)}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                          <Calendar initialFocus mode="range" defaultMonth={filterDate?.from} selected={filterDate} onSelect={setFilterDate} numberOfMonths={2} locale={es} />
                      </PopoverContent>
                  </Popover>
                </div>
                 <div className="space-y-2">
                    <Label>Integrante Específico</Label>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={openCombobox} className="w-full justify-between">
                            {filterFirefighter !== 'all' ? `${allFirefighters.find(f => f.id === filterFirefighter)?.firstName} ${allFirefighters.find(f => f.id === filterFirefighter)?.lastName}` : "Todos los integrantes"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                            <CommandInput placeholder="Buscar integrante..." />
                            <CommandList>
                                <CommandEmpty>No se encontró el integrante.</CommandEmpty>
                                <CommandItem value='all' onSelect={() => { setFilterFirefighter('all'); setOpenCombobox(false); }}>
                                     <Check className={cn("mr-2 h-4 w-4", filterFirefighter === 'all' ? "opacity-100" : "opacity-0")} />
                                    Todos los integrantes
                                </CommandItem>
                                {allFirefighters.map((firefighter) => (
                                <CommandItem key={firefighter.id} value={`${firefighter.firstName} ${firefighter.lastName}`} onSelect={() => { setFilterFirefighter(firefighter.id); setOpenCombobox(false);}}>
                                    <Check className={cn("mr-2 h-4 w-4", filterFirefighter === firefighter.id ? "opacity-100" : "opacity-0")} />
                                    {`${firefighter.legajo} - ${firefighter.firstName} ${firefighter.lastName}`}
                                </CommandItem>
                                ))}
                            </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                {activeTab === 'attendance' && (
                    <div className="space-y-2">
                        <Label>Especialidad</Label>
                        <Select value={filterSpecialization} onValueChange={setFilterSpecialization}>
                            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las especialidades</SelectItem>
                                {specializations.map(spec => <SelectItem key={spec} value={spec}>{spec}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {activeTab === 'attendance' && (
                    <div className="space-y-2">
                        <Label>Clase Específica</Label>
                        <Select value={filterClass} onValueChange={setFilterClass}>
                            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las clases</SelectItem>
                                {availableClassesForFilter.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="space-y-2">
                    <Label>Jerarquía</Label>
                    <MultiSelectFilter title="Jerarquías" options={hierarchyOptions} selected={filterHierarchy} onSelectedChange={setFilterHierarchy} />
                </div>
                <div className="space-y-2">
                    <Label>Cuartel</Label>
                    <MultiSelectFilter title="Cuarteles" options={stationOptions} selected={filterStation} onSelectedChange={setFilterStation} />
                </div>
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <>
                <PageHeader title="Reportes" description="Genere y exporte reportes de asistencia y actividad." />
                <Skeleton className="w-full h-96" />
            </>
        )
    }

    return (
        <>
            <PageHeader title="Reportes" description="Filtre y analice los datos de asistencia y licencias." />
            
            <Tabs defaultValue="attendance" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-md mb-4">
                    <TabsTrigger value="attendance"><UserCheck className="mr-2 h-4 w-4"/>Asistencia</TabsTrigger>
                    {user?.role === 'Ayudantía' && <TabsTrigger value="leaves"><ClipboardMinus className="mr-2 h-4 w-4"/>Licencias</TabsTrigger>}
                </TabsList>
                
                <TabsContent value="attendance">
                    <CommonFilters />
                    {attendanceReportData.total > 0 ? (
                        <div className="space-y-8">
                             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                                 {summaryCards.map((card, index) => (
                                    <Card key={index}>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                                             <card.icon className={cn("h-4 w-4 text-muted-foreground", card.color)} />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{card.value}</div>
                                            <p className="text-xs text-muted-foreground">
                                                {attendanceReportData.total > 0 ? `${((card.value / attendanceReportData.total) * 100).toFixed(1)}% del total` : ''}
                                            </p>
                                        </CardContent>
                                    </Card>
                                 ))}
                            </div>
                            <div className="grid gap-8 lg:grid-cols-5">
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="font-headline">Distribución de Asistencia</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={{}} className="h-[250px] w-full">
                                             <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                                    <Pie data={attendanceReportData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={100} innerRadius={60}>
                                                        {attendanceReportData.pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                                                    </Pie>
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                                 <Card className="lg:col-span-3">
                                     <CardHeader>
                                        <CardTitle className="font-headline">Detalle de Registros</CardTitle>
                                     </CardHeader>
                                     <CardContent className="max-h-[300px] overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Bombero</TableHead>
                                                    <TableHead>Clase</TableHead>
                                                    <TableHead>Estado</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {attendanceReportData.details.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium">{`${item.firefighter.firstName} ${item.firefighter.lastName}`}</TableCell>
                                                        <TableCell className="text-muted-foreground">{item.session.title}</TableCell>
                                                        <TableCell><Badge className={cn("whitespace-nowrap", getStatusClass(item.status))}>{getStatusLabel(item.status)}</Badge></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                     </CardContent>
                                 </Card>
                            </div>
                            <Card className="mt-8">
                                <CardHeader>
                                    <CardTitle className="font-headline">Generar Reporte en PDF</CardTitle>
                                    <CardDescription>Seleccione qué contenido incluir en la exportación del PDF.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col space-y-4 mb-4">
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="include-summary-pdf"
                                                checked={includeSummaryInPdf}
                                                onCheckedChange={setIncludeSummaryInPdf}
                                            />
                                            <Label htmlFor="include-summary-pdf">Incluir resumen por porcentaje</Label>
                                        </div>
                                         <div className="flex items-center space-x-2">
                                            <Switch
                                                id="include-details-pdf"
                                                checked={includeDetailsInPdf}
                                                onCheckedChange={setIncludeDetailsInPdf}
                                            />
                                            <Label htmlFor="include-details-pdf">Incluir detalle de asistencia por clase</Label>
                                        </div>
                                    </div>
                                    <Button onClick={generatePdf} disabled={generatingPdf || (!includeSummaryInPdf && !includeDetailsInPdf)}>
                                        {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                        {generatingPdf ? "Generando..." : "Generar PDF de Asistencia"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    ) : ( <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg"><p className="text-muted-foreground">No hay datos de asistencia para los filtros seleccionados.</p></div>)}
                </TabsContent>
                
                {user?.role === 'Ayudantía' && (
                    <TabsContent value="leaves">
                        <CommonFilters />
                        {leavesReportData.length > 0 ? (
                             <Card>
                                <CardHeader><CardTitle className="font-headline">Detalle de Licencias</CardTitle><CardDescription>Todas las licencias registradas para los filtros aplicados.</CardDescription></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Bombero</TableHead><TableHead>Tipo</TableHead><TableHead>Desde</TableHead><TableHead>Hasta</TableHead></TableRow></TableHeader>
                                        <TableBody>{leavesReportData.map((leave) => (<TableRow key={leave.id}><TableCell className="font-medium">{leave.firefighterName}</TableCell><TableCell>{leave.type}</TableCell><TableCell>{format(new Date(leave.startDate), "PPP", { locale: es })}</TableCell><TableCell>{format(new Date(leave.endDate), "PPP", { locale: es })}</TableCell></TableRow>))}</TableBody>
                                    </Table>
                                </CardContent>
                                <CardHeader><CardTitle className="font-headline">Generar Reporte en PDF</CardTitle><CardDescription>Genere un PDF con los datos de licencias filtrados actualmente.</CardDescription></CardHeader>
                                <CardContent><Button onClick={generateLeavesPdf} disabled={generatingPdf || leavesReportData.length === 0}>{generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{generatingPdf ? "Generando..." : "Generar PDF de Licencias"}</Button></CardContent>
                            </Card>
                        ) : ( <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg"><p className="text-muted-foreground">No hay datos de licencias para los filtros seleccionados.</p></div> )}
                    </TabsContent>
                )}
            </Tabs>
        </>
    );
}

    
