

'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Download, UserCheck, UserX, Clock, ShieldAlert, ChevronsUpDown, Check, Loader2, ClipboardMinus, Percent } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { es } from 'date-fns/locale';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
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
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { usePathname } from 'next/navigation';


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

// Register the datalabels plugin
Chart.register(ChartDataLabels);

export default function ReportsPage() {
    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
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
    
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);
    const isBomberoRole = activeRole === 'Bombero';

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

                if (isBomberoRole && user) {
                    const firefighterUser = firefightersData.find(f => f.legajo === user.id);
                    if(firefighterUser) {
                        setFilterFirefighter(firefighterUser.id);
                    } else {
                        // User is a 'Bombero' but not in the firefighters list, show no data.
                        setFilterFirefighter('__NOT_FOUND__');
                    }
                }

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
    }, [toast, user, isBomberoRole]);
    
const generateChartImage = async (data: { present: number; absent: number; tardy: number; excused: number; }): Promise<string> => {
    const canvas = document.createElement('canvas');
    // Increased resolution for better quality
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';
    
    const whiteBackgroundPlugin = {
        id: 'whiteBackground',
        beforeDraw: (chart: Chart) => {
            const ctx = chart.canvas.getContext('2d');
            if (ctx) {
                ctx.save();
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        }
    };

    return new Promise((resolve) => {
        const chartData = [data.present, data.absent, data.tardy, data.excused];
        const total = chartData.reduce((a, b) => a + b, 0);

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ["Presente", "Ausente", "Tarde", "Justificado"],
                datasets: [{
                    data: chartData,
                    backgroundColor: [PIE_CHART_COLORS.present, PIE_CHART_COLORS.absent, PIE_CHART_COLORS.tardy, PIE_CHART_COLORS.excused],
                    barPercentage: 0.5,
                }],
            },
            plugins: [ChartDataLabels, whiteBackgroundPlugin],
            options: {
                responsive: false,
                animation: {
                    duration: 0,
                    onComplete: (context) => {
                        resolve(context.chart.toBase64Image('image/png', 1.0)); // Use PNG for better quality
                        context.chart.destroy();
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false },
                    datalabels: {
                        anchor: 'end',
                        align: (context) => {
                            const value = context.dataset.data[context.dataIndex] as number;
                            const maxValue = Math.max(...(context.dataset.data as number[]));
                            return value > maxValue * 0.85 ? 'start' : 'end';
                        },
                        formatter: (value) => {
                            if (total === 0) return '0%';
                            const percentage = (value / total) * 100;
                            return `${percentage.toFixed(0)}%`;
                        },
                        color: (context) => {
                            const value = context.dataset.data[context.dataIndex] as number;
                            const maxValue = Math.max(...(context.dataset.data as number[]));
                            return value > maxValue * 0.85 ? '#ffffff' : '#333333';
                        },
                        font: {
                            weight: 'bold',
                            size: 16, // Increased font size for higher res
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { 
                            precision: 0,
                            font: {
                                size: 14 // Increased font size
                            }
                        }
                    },
                    x: {
                         ticks: {
                            font: {
                                size: 14 // Increased font size
                            }
                         }
                    }
                },
            },
        });
    });
};
    
    const generatePdf = async () => {
        if (!logoDataUrl) {
            toast({ title: "Espere un momento", description: "El logo para el PDF aún se está cargando.", variant: "destructive" });
            return;
        }
    
        setGeneratingPdf(true);
        const doc = new jsPDF();
    
        try {
            // Header
            doc.setFillColor(220, 53, 69);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text("Reporte de Asistencia", 14, 22);
            doc.addImage(logoDataUrl, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');
    
            // Subheader
            doc.setFontSize(11);
            doc.setTextColor(108, 117, 125);
            doc.setFont('helvetica', 'normal');
            const dateText = filterDate?.from ? `Período: ${format(filterDate.from, "P", { locale: es })} - ${format(filterDate.to ?? filterDate.from, "P", { locale: es })}` : "Período: Todos los registros";
            doc.text(dateText, 14, 45);
    
            let currentY = 55;
    
            if (attendanceReportData.details.length > 0) {
                 const chartImage = await generateChartImage(attendanceReportData.summary);
                 if (chartImage) {
                    doc.setFontSize(12);
                    doc.setTextColor(40, 40, 40);
                    doc.setFont('helvetica', 'bold');
                    doc.text("Resumen Gráfico de Asistencia", 14, currentY);
                    currentY += 5;
                    doc.addImage(chartImage, 'PNG', 14, currentY, 180, 90); 
                    currentY += 100;
                 }
            }
            
            // Summary Table
            if (includeSummaryInPdf && summaryTableData.length > 0) {
                if (currentY > 250) { doc.addPage(); currentY = 20; }
                doc.setFontSize(12);
                doc.setTextColor(40, 40, 40);
                doc.setFont('helvetica', 'bold');
                doc.text("Resumen de Asistencia por Bombero", 14, currentY);
                currentY += 8;
    
                 (doc as any).autoTable({
                    startY: currentY,
                    head: [['Bombero', 'Clases', '% Presentismo']],
                    body: summaryTableData.map(item => [
                        item.firefighter,
                        item.totalClasses,
                        item.presentPercentage
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: '#333333' },
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
            }
    
            // Details Table
            if (includeDetailsInPdf && attendanceReportData.details.length > 0) {
                if (currentY > 250) { doc.addPage(); currentY = 20; }
                doc.setFontSize(12);
                doc.setTextColor(40, 40, 40);
                doc.setFont('helvetica', 'bold');
                doc.text("Detalle de Registros de Asistencia", 14, currentY);
                currentY += 8;

                const sortedDetails = [...attendanceReportData.details].sort((a, b) => {
                    const firehouseOrder = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
                    const aIndex = firehouseOrder.indexOf(a.firefighter.firehouse);
                    const bIndex = firehouseOrder.indexOf(b.firefighter.firehouse);
                    
                    if (aIndex !== bIndex) {
                        return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
                    }
                    return a.firefighter.legajo.localeCompare(b.firefighter.legajo);
                });

                const tableBody: any[] = [];
                let lastFirehouse = '';

                sortedDetails.forEach(item => {
                    const firehouse = item.firefighter.firehouse || 'Sin Cuartel';
                    if (firehouse !== lastFirehouse) {
                        tableBody.push([{ 
                            content: `--- ${firehouse} ---`, 
                            colSpan: 5, 
                            styles: { fontStyle: 'bold', halign: 'center', fillColor: '#f0f0f0' } 
                        }]);
                        lastFirehouse = firehouse;
                    }
                    
                    let name = `${item.firefighter.legajo} - ${item.firefighter.firstName} ${item.firefighter.lastName}`;
                    if (item.session.instructorIds?.includes(item.firefighter.id)) name += ' (I)';
                    else if (item.session.assistantIds?.includes(item.firefighter.id)) name += ' (A)';
                    
                    tableBody.push([
                        name, 
                        item.session.title, 
                        item.session.specialization, 
                        item.session.date, 
                        getStatusLabel(item.status)
                    ]);
                });
    
                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Bombero', 'Clase', 'Especialidad', 'Fecha', 'Estado']],
                    body: tableBody,
                    theme: 'striped',
                    headStyles: { fillColor: '#333333' },
                });
            }
    
            if (attendanceReportData.details.length === 0) {
                doc.text("No se encontraron registros de asistencia con los filtros aplicados.", 14, currentY);
            }
    
            doc.save(`reporte-asistencia-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            console.error("PDF Generation Error: ", error);
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
        // 1. Get all attendance records that match the date, class and specialization filters.
        let preliminaryRecords: { firefighter: Firefighter, status: AttendanceStatus, session: Session }[] = [];
        const filteredSessions = allSessions.filter(session => {
            if (filterSpecialization !== 'all' && session.specialization !== filterSpecialization) return false;
            if (filterClass !== 'all' && session.id !== filterClass) return false;
            if (filterDate?.from) {
                 const sessionDate = parseISO(session.date);
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
                        preliminaryRecords.push({ firefighter, status: session.attendance[firefighterId], session });
                    }
                }
            }
        }
        
        // 2. Filter these records by firefighter, station and hierarchy
        const finalData = preliminaryRecords.filter(({ firefighter }) => {
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

        // 3. Calculate all counts based on the final, filtered data
        const statusCounts = {
            present: finalData.filter(item => item.status === 'present').length,
            absent: finalData.filter(item => item.status === 'absent').length,
            tardy: finalData.filter(item => item.status === 'tardy').length,
            recupero: finalData.filter(item => item.status === 'recupero').length,
            excused: finalData.filter(item => item.status === 'excused').length,
        };

        // 4. Calculate summary stats
        const effectiveAttendance = statusCounts.present + statusCounts.tardy + statusCounts.recupero;
        const totalAbsences = statusCounts.absent + statusCounts.excused;
        const netAbsences = Math.max(0, totalAbsences - statusCounts.recupero);
        const totalClassesForPercentage = effectiveAttendance + totalAbsences;

        // 5. Prepare Pie Chart data - THIS IS THE CHANGED PART
        const pieData = [
            { name: 'Presente', value: statusCounts.present + statusCounts.recupero, fill: PIE_CHART_COLORS.present },
            { name: 'Tarde', value: statusCounts.tardy, fill: PIE_CHART_COLORS.tardy },
            { name: 'Ausente', value: statusCounts.absent + statusCounts.excused, fill: PIE_CHART_COLORS.absent },
        ].filter(item => item.value > 0);
            
        return { 
            summary: {
                present: effectiveAttendance,
                absent: netAbsences,
                tardy: statusCounts.tardy,
                excused: statusCounts.excused,
                totalForPercentage: totalClassesForPercentage
            },
            pieData, 
            details: finalData
        };

    }, [allSessions, allFirefighters, filterDate, filterSpecialization, filterClass, filterHierarchy, filterStation, filterFirefighter]);
    
     const summaryTableData = useMemo(() => {
        const relevantRecords = attendanceReportData.details;
        if (relevantRecords.length === 0) return [];
        
        const firefighterIdsInFilter = new Set(relevantRecords.map(d => d.firefighter.id));

        return Array.from(firefighterIdsInFilter).map(firefighterId => {
            const firefighter = allFirefighters.find(f => f.id === firefighterId)!;
            const records = relevantRecords.filter(d => d.firefighter.id === firefighterId);
            
            const presentCount = records.filter(d => d.status === 'present' || d.status === 'tardy').length;
            const absentCount = records.filter(d => d.status === 'absent' || d.status === 'excused').length;
            const recuperoCount = records.filter(d => d.status === 'recupero').length;

            const totalClasses = presentCount + absentCount;
            // An absence and a recupero cancel each other out.
            // Effective attendance is presents + recuperos that cancel out absences.
            const effectivePresent = presentCount + recuperoCount;

            if (totalClasses === 0) {
                 return {
                    firefighterId: firefighter.id,
                    firefighter: `${firefighter.firstName} ${firefighter.lastName}`,
                    totalClasses: 0,
                    presentPercentage: 'N/A',
                };
            }
            
            const percentage = Math.min(100, (effectivePresent / totalClasses) * 100);

            return {
                firefighterId: firefighter.id,
                firefighter: `${firefighter.firstName} ${firefighter.lastName}`,
                totalClasses,
                presentPercentage: `${percentage.toFixed(0)}%`,
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.firefighter.localeCompare(b.firefighter));
    }, [attendanceReportData.details, allFirefighters]);


    const leavesReportData = useMemo(() => {
        return allLeaves.filter(leave => {
            const firefighter = allFirefighters.find(f => f.id === leave.firefighterId);
            
            // For 'Bombero' role, they can't see this tab anyway, but as a safeguard:
            if (activeRole === 'Bombero') return false;

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
                const leaveStartDate = startOfDay(parseISO(leave.startDate));
                const leaveEndDate = endOfDay(parseISO(leave.endDate));
                const filterStartDate = startOfDay(filterDate.from);
                const filterEndDate = endOfDay(filterDate.to ?? filterDate.from);
                if (leaveStartDate > filterEndDate || leaveEndDate < filterStartDate) return false;
            }
            return true;
        });
    }, [allLeaves, allFirefighters, filterFirefighter, filterDate, filterHierarchy, filterStation, activeRole]);

    const availableClassesForFilter = useMemo(() => {
        return allSessions.map(s => ({ value: s.id, label: `${s.date} - ${s.title}` }));
    }, [allSessions]);
    
    const overallAttendancePercentage = useMemo(() => {
        const totalClassesSum = summaryTableData.reduce((acc, item) => acc + item.totalClasses, 0);
        const totalPercentageSum = summaryTableData.reduce((acc, item) => {
            const percentage = parseFloat(item.presentPercentage.replace('%', ''));
            if (!isNaN(percentage)) {
                return acc + (percentage / 100) * item.totalClasses;
            }
            return acc;
        }, 0);

        if (totalClassesSum === 0) return "0";
        return ((totalPercentageSum / totalClassesSum) * 100).toFixed(0);
    }, [summaryTableData]);

    const summaryCards = [
        { title: "Asistencias Efectivas", value: attendanceReportData.summary.present, icon: UserCheck, color: "text-green-500" },
        { title: "Ausencias Netas", value: attendanceReportData.summary.absent, icon: UserX, color: "text-red-500" },
        { title: "Justificadas (Licencia)", value: attendanceReportData.summary.excused, icon: ShieldAlert, color: "text-violet-500" },
        { title: "% Presentismo General", value: `${overallAttendancePercentage}%`, icon: Percent, color: "text-blue-500" },
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
                <CardTitle className="font-headline">{isBomberoRole ? 'Filtros de Reporte' : 'Filtros de Reporte de Asistencia'}</CardTitle>
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
                { !isBomberoRole && (
                    <>
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
                        <div className="space-y-2">
                            <Label>Jerarquía</Label>
                            <MultiSelectFilter title="Jerarquías" options={hierarchyOptions} selected={filterHierarchy} onSelectedChange={setFilterHierarchy} />
                        </div>
                        <div className="space-y-2">
                            <Label>Cuartel</Label>
                            <MultiSelectFilter title="Cuarteles" options={stationOptions} selected={filterStation} onSelectedChange={setFilterStation} />
                        </div>
                    </>
                )}
                {activeTab === 'attendance' && (
                    <>
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
                    </>
                )}
                
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <>
                <PageHeader title={isBomberoRole ? 'Mi Reporte' : 'Reportes'} description="Genere y exporte reportes de asistencia y actividad." />
                <Skeleton className="w-full h-96" />
            </>
        )
    }

    return (
        <>
            <PageHeader title={isBomberoRole ? 'Mi Reporte' : 'Reportes'} description={isBomberoRole ? 'Aquí puede ver y exportar su historial de asistencia.' : 'Filtre y analice los datos de asistencia y licencias.'} />
            
            <Tabs defaultValue="attendance" className="w-full" onValueChange={setActiveTab}>
                 {user?.role !== 'Bombero' && (
                    <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-4">
                        <TabsTrigger value="attendance"><UserCheck className="mr-2 h-4 w-4"/>Asistencia</TabsTrigger>
                        {(activeRole === 'Ayudantía' || activeRole === 'Administrador' || activeRole === 'Master') && <TabsTrigger value="leaves"><ClipboardMinus className="mr-2 h-4 w-4"/>Licencias</TabsTrigger>}
                    </TabsList>
                 )}
                
                <TabsContent value="attendance">
                    <CommonFilters />
                    {attendanceReportData.details.length > 0 ? (
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
                                        </CardContent>
                                    </Card>
                                 ))}
                            </div>
                            <div className="grid gap-8 lg:grid-cols-5">
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="font-headline">Distribución de Estados</CardTitle>
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
                                        <CardTitle className="font-headline">Resumen por Bombero</CardTitle>
                                     </CardHeader>
                                     <CardContent className="max-h-[300px] overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Bombero</TableHead>
                                                    <TableHead>Clases</TableHead>
                                                    <TableHead>% Presentismo</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {summaryTableData.map((item) => (
                                                    <TableRow key={item.firefighterId}>
                                                        <TableCell className="font-medium">{item.firefighter}</TableCell>
                                                        <TableCell>{item.totalClasses}</TableCell>
                                                        <TableCell className="font-semibold">{item.presentPercentage}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                     </CardContent>
                                 </Card>
                            </div>
                            
                             <Card className="mt-8">
                                <CardHeader>
                                    <CardTitle className="font-headline">Detalle de Asistencias</CardTitle>
                                    <CardDescription>
                                        Todos los registros individuales que coinciden con los filtros aplicados.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="max-h-[400px] overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Bombero</TableHead>
                                                <TableHead>Clase</TableHead>
                                                <TableHead className="hidden sm:table-cell">Especialidad</TableHead>
                                                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                                                <TableHead>Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {attendanceReportData.details.map((item, index) => {
                                                const isInstructor = item.session.instructorIds?.includes(item.firefighter.id);
                                                const isAssistant = item.session.assistantIds?.includes(item.firefighter.id);
                                                return (
                                                    <TableRow key={`${item.session.id}-${item.firefighter.id}-${index}`}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <span>{`${item.firefighter.firstName} ${item.firefighter.lastName}`}</span>
                                                                {isInstructor && <Badge variant="destructive">I</Badge>}
                                                                {isAssistant && <Badge variant="secondary">A</Badge>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{item.session.title}</TableCell>
                                                        <TableCell className="hidden sm:table-cell">{item.session.specialization}</TableCell>
                                                        <TableCell className="hidden md:table-cell">{item.session.date}</TableCell>
                                                        <TableCell>
                                                             <Badge className={cn("whitespace-nowrap", getStatusClass(item.status))}>
                                                                {getStatusLabel(item.status)}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>


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
                                    <Button onClick={generatePdf} disabled={generatingPdf}>
                                        {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                        {generatingPdf ? "Generando..." : "Generar PDF de Asistencia"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    ) : ( <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg"><p className="text-muted-foreground">No hay datos de asistencia para los filtros seleccionados.</p></div>)}
                </TabsContent>
                
                {(user?.role === 'Ayudantía' || user?.role === 'Administrador' || user?.role === 'Oficial') && (
                    <TabsContent value="leaves">
                        <CommonFilters />
                        {leavesReportData.length > 0 ? (
                             <Card>
                                <CardHeader><CardTitle className="font-headline">Detalle de Licencias</CardTitle><CardDescription>Todas las licencias registradas para los filtros aplicados.</CardDescription></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Bombero</TableHead><TableHead>Tipo</TableHead><TableHead>Desde</TableHead><TableHead>Hasta</TableHead></TableRow></TableHeader>
                                        <TableBody>{leavesReportData.map((leave) => (<TableRow key={leave.id}><TableCell className="font-medium">{leave.firefighterName}</TableCell><TableCell>{leave.type}</TableCell><TableCell>{format(parseISO(leave.startDate), "PPP", { locale: es })}</TableCell><TableCell>{format(parseISO(leave.endDate), "PPP", { locale: es })}</TableCell></TableRow>))}</TableBody>
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
