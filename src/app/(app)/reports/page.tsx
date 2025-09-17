
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Download, UserCheck, UserX, Clock, ShieldAlert, ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { es } from 'date-fns/locale';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useState, useEffect, useMemo } from "react";
import { Session, Firefighter, AttendanceStatus } from "@/lib/types";
import { getSessions } from "@/services/sessions.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import jsPDF from 'jspdf';
import 'jspdf-autotable';


const specializations = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE', 'VARIOS'];

const hierarchyOptions = [
    { value: 'all', label: 'Todas las Jerarquías' },
    { value: 'aspirantes', label: 'Solo Aspirantes' },
    { value: 'bomberos', label: 'Solo Bomberos' },
    { value: 'suboficiales_oficiales', label: 'Suboficiales y Oficiales' }
];

const stationOptions = [
    { value: 'all', label: 'Todos los Cuarteles' },
    { value: 'Cuartel 1', label: 'Cuartel 1' },
    { value: 'Cuartel 2', label: 'Cuartel 2' },
    { value: 'Cuartel 3', label: 'Cuartel 3' },
];

const PIE_CHART_COLORS = {
    present: "#22C55E", // green-500
    absent: "#EF4444", // red-500
    tardy: "#FBBF24", // yellow-400
    excused: "#8B5CF6", // violet-500
};

const getStatusClass = (status: AttendanceStatus) => {
    switch (status) {
        case "present": return "bg-green-600 hover:bg-green-700 text-white border-green-600";
        case "absent": return "bg-red-600 hover:bg-red-700 text-white border-red-600";
        case "tardy": return "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500";
        case "excused": return "bg-violet-600 hover:bg-violet-700 text-white border-violet-600";
        default: return "";
    }
}
const getStatusLabel = (status: AttendanceStatus) => {
    const labels: Record<AttendanceStatus, string> = { present: "Presente", absent: "Ausente", tardy: "Tarde", excused: "Justificado" };
    return labels[status] || "N/A";
}


export default function ReportsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    // Raw Data
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);

    // Filters
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterClass, setFilterClass] = useState('all');
    const [filterHierarchy, setFilterHierarchy] = useState('all');
    const [filterStation, setFilterStation] = useState('all');
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [openCombobox, setOpenCombobox] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const sessionsData = await getSessions();
                const firefightersData = await getFirefighters();
                setAllSessions(sessionsData);
                setAllFirefighters(firefightersData);

            } catch (error) {
                toast({ title: "Error", description: "No se pudieron cargar los datos para los reportes.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        const fetchLogo = async () => {
             try {
                const logoUrl = 'https://i.ibb.co/yF0SYDNF/logo.png';
                const response = await fetch(logoUrl);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    setLogoDataUrl(reader.result as string);
                };
                reader.readAsDataURL(blob);
             } catch (error) {
                 console.error("Failed to load logo for PDF", error);
                 toast({ title: "Advertencia", description: "No se pudo cargar el logo para los reportes en PDF.", variant: "default" });
             }
        }
        fetchData();
        fetchLogo();
    }, [toast]);
    
    const generatePdf = async () => {
        if (!logoDataUrl) {
             toast({
                title: "Espere un momento",
                description: "El logo para el PDF aún se está cargando. Intente de nuevo en unos segundos.",
                variant: "destructive"
            });
            return;
        }

        setGeneratingPdf(true);
        const doc = new jsPDF();
        
        try {
            // --- HEADER ---
            doc.setFillColor(220, 53, 69); // Red color for header
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text("Reporte de Asistencia", 14, 22);
            
            // Add compressed image
            const img = new Image();
            img.src = logoDataUrl;
            await new Promise(resolve => img.onload = resolve);
            
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            const compressedLogoDataUrl = canvas.toDataURL('image/jpeg', 0.7); // Compress to 70% quality JPEG
            
            doc.addImage(compressedLogoDataUrl, 'JPEG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');

            // --- SUBHEADER / FILTERS ---
            doc.setFontSize(11);
            doc.setTextColor(108, 117, 125);
            doc.setFont('helvetica', 'normal');
            const dateText = filterDate?.from
                ? `Período: ${format(filterDate.from, "P", { locale: es })} - ${format(filterDate.to ?? filterDate.from, "P", { locale: es })}`
                : "Período: Todos los registros";
            doc.text(dateText, 14, 45);

            // --- SUMMARY BARS ---
            let currentY = 55;
            const barHeight = 6;
            const barWidth = 80;
            const barStartX = 55;

            const summaryItems = [
                { label: 'Asistentes', value: reportData.summary.present + reportData.summary.tardy, color: '#22C55E' },
                { label: 'Ausentes', value: reportData.summary.absent + reportData.summary.excused, color: '#EF4444' }
            ];

            doc.setFontSize(10);

            summaryItems.forEach(item => {
                if (currentY > doc.internal.pageSize.getHeight() - 30) {
                     doc.addPage();
                     currentY = 20;
                }
                const percentage = reportData.total > 0 ? (item.value / reportData.total) * 100 : 0;
                const filledWidth = (percentage / 100) * barWidth;

                // Label
                doc.setTextColor(40, 40, 40);
                doc.setFont('helvetica', 'bold');
                doc.text(item.label, 14, currentY + barHeight - 1);
                
                // Background bar
                doc.setFillColor(230, 230, 230);
                doc.rect(barStartX, currentY, barWidth, barHeight, 'F');
                
                // Filled bar
                doc.setFillColor(item.color);
                doc.rect(barStartX, currentY, filledWidth, barHeight, 'F');

                // Value text
                doc.setTextColor(80, 80, 80);
                doc.setFont('helvetica', 'normal');
                const valueText = `${item.value} (${percentage.toFixed(1)}%)`;
                doc.text(valueText, barStartX + barWidth + 5, currentY + barHeight - 1);

                currentY += 12;
            });
            
            currentY += 5;

            // --- DETAILS TABLES ---
            if (currentY > doc.internal.pageSize.getHeight() - 40) {
                doc.addPage();
                currentY = 20;
            }
            doc.setFontSize(12);
            doc.setTextColor(40, 40, 40);
            doc.setFont('helvetica', 'bold');

            const attendeesDetails = reportData.details;
            
            if(attendeesDetails.length > 0) {
                doc.text("Detalle de Registros", 14, currentY);
                currentY += 5;
                 (doc as any).autoTable({
                    startY: currentY,
                    head: [['Bombero', 'Clase', 'Fecha', 'Estado']],
                    body: attendeesDetails.map(item => [
                        `${item.firefighter.firstName} ${item.firefighter.lastName}`,
                        item.session.title,
                        item.session.date,
                        getStatusLabel(item.status)
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [51, 51, 51] },
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
            }
            

            // --- SIGNATURE AND FOOTER ---
            if (currentY > doc.internal.pageSize.getHeight() - 40) {
                doc.addPage();
                currentY = 20;
            }
            
            const signatureLineLength = 60;
            const signatureX = (doc.internal.pageSize.getWidth() / 2) - (signatureLineLength / 2);
            
            doc.setFontSize(10);
            doc.setTextColor(40, 40, 40);
            doc.text("Firma:", signatureX, currentY + 25);
            doc.line(signatureX + 15, currentY + 25, signatureX + signatureLineLength, currentY + 25);
            doc.text("Aclaración:", signatureX, currentY + 35);
            doc.line(signatureX + 22, currentY + 35, signatureX + signatureLineLength, currentY + 35);
            
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                const pageStr = `Página ${i} de ${pageCount}`;
                doc.text(pageStr, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.height - 10, { align: 'center' });
            }

            doc.save(`reporte-asistencia-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({
                title: "Error al generar PDF",
                description: "Hubo un problema al crear el archivo PDF.",
                variant: "destructive"
            });
            console.error(error);
        } finally {
            setGeneratingPdf(false);
        }
    };


    const reportData = useMemo(() => {
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
                        filteredAttendance.push({
                            firefighter,
                            status: session.attendance[firefighterId],
                            session,
                        });
                    }
                }
            }
        }
        
        const finalData = filteredAttendance.filter(({ firefighter }) => {
            if (filterFirefighter !== 'all' && firefighter.id !== filterFirefighter) return false;
            if (filterStation !== 'all' && firefighter.firehouse !== filterStation) return false;
            if (filterHierarchy !== 'all') {
                const suboficialRanks = ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR'];
                const oficialRanks = ['OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'];

                if (filterHierarchy === 'bomberos' && firefighter.rank !== 'BOMBERO') return false;
                if (filterHierarchy === 'aspirantes' && firefighter.rank !== 'ASPIRANTE') return false;
                if (filterHierarchy === 'suboficiales_oficiales' && ![...suboficialRanks, ...oficialRanks].includes(firefighter.rank)) return false;
            }
            return true;
        });

        const summary = {
            present: finalData.filter(item => item.status === 'present').length,
            absent: finalData.filter(item => item.status === 'absent').length,
            tardy: finalData.filter(item => item.status === 'tardy').length,
            excused: finalData.filter(item => item.status === 'excused').length,
        };
        const total = Object.values(summary).reduce((a, b) => a + b, 0);

        const pieData = Object.entries(summary)
            .filter(([, value]) => value > 0)
            .map(([name, value]) => ({
                name: getStatusLabel(name as AttendanceStatus),
                value,
                fill: PIE_CHART_COLORS[name as keyof typeof PIE_CHART_COLORS],
            }));
            
        return {
            summary,
            total,
            pieData,
            details: finalData
        };

    }, [allSessions, allFirefighters, filterDate, filterSpecialization, filterClass, filterHierarchy, filterStation, filterFirefighter]);

    const availableClassesForFilter = useMemo(() => {
        return allSessions.map(s => ({ value: s.id, label: `${s.date} - ${s.title}` }));
    }, [allSessions]);
    
    const summaryCards = [
        { title: "Presentes", value: reportData.summary.present, icon: UserCheck, color: "text-green-500" },
        { title: "Ausentes", value: reportData.summary.absent, icon: UserX, color: "text-red-500" },
        { title: "Tardes", value: reportData.summary.tardy, icon: Clock, color: "text-yellow-500" },
        { title: "Justificados", value: reportData.summary.excused, icon: ShieldAlert, color: "text-violet-500" },
    ];
    
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent === 0) return null;

        return (
            <text
            x={x}
            y={y}
            fill={'#333'}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
                fontSize: '14px',
                fontWeight: 'bold',
                paintOrder: 'stroke',
                stroke: '#fff',
                strokeWidth: '3px',
                strokeLinecap: 'butt',
                strokeLinejoin: 'miter',
            }}
            >
            {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

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
            <PageHeader title="Reportes" description="Filtre y analice los datos de asistencia a las capacitaciones." />
            
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="font-headline">Filtros de Reporte</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div className="space-y-2">
                      <Label>Rango de Fechas</Label>
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button
                                  variant={"outline"}
                                  className={cn("w-full justify-start text-left font-normal", !filterDate && "text-muted-foreground")}
                              >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {filterDate?.from ? (
                                      filterDate.to ? (
                                          <>{format(filterDate.from, "LLL dd, y", { locale: es })} - {format(filterDate.to, "LLL dd, y", { locale: es })}</>
                                      ) : (format(filterDate.from, "LLL dd, y", { locale: es }))
                                  ) : (<span>Seleccionar rango</span>)}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                  initialFocus
                                  mode="range"
                                  defaultMonth={filterDate?.from}
                                  selected={filterDate}
                                  onSelect={setFilterDate}
                                  numberOfMonths={2}
                                  locale={es}
                              />
                          </PopoverContent>
                      </Popover>
                    </div>
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
                     <div className="space-y-2">
                        <Label>Jerarquía</Label>
                         <Select value={filterHierarchy} onValueChange={setFilterHierarchy}>
                            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                            <SelectContent>
                                {hierarchyOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                         </Select>
                    </div>
                     <div className="space-y-2">
                       <Label>Cuartel</Label>
                        <Select value={filterStation} onValueChange={setFilterStation}>
                            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                            <SelectContent>
                                {stationOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Integrante Específico</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild>
                                <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCombobox}
                                className="w-full justify-between"
                                >
                                {filterFirefighter !== 'all'
                                    ? `${allFirefighters.find(f => f.id === filterFirefighter)?.firstName} ${allFirefighters.find(f => f.id === filterFirefighter)?.lastName}`
                                    : "Seleccionar integrante..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                <CommandInput placeholder="Buscar integrante..." />
                                <CommandList>
                                    <CommandEmpty>No se encontró el integrante.</CommandEmpty>
                                    <CommandItem
                                        value='all'
                                        onSelect={() => {
                                            setFilterFirefighter('all');
                                            setOpenCombobox(false);
                                        }}
                                        >
                                         <Check className={cn("mr-2 h-4 w-4", filterFirefighter === 'all' ? "opacity-100" : "opacity-0")} />
                                        Todos los integrantes
                                    </CommandItem>
                                    {allFirefighters.map((firefighter) => (
                                    <CommandItem
                                        key={firefighter.id}
                                        value={`${firefighter.firstName} ${firefighter.lastName}`}
                                        onSelect={() => {
                                            setFilterFirefighter(firefighter.id);
                                            setOpenCombobox(false);
                                        }}
                                    >
                                        <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            filterFirefighter === firefighter.id ? "opacity-100" : "opacity-0"
                                        )}
                                        />
                                        {`${firefighter.legajo} - ${firefighter.firstName} ${firefighter.lastName}`}
                                    </CommandItem>
                                    ))}
                                </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>

            {reportData.total > 0 ? (
                <div className="space-y-8">
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                         {summaryCards.map((card, index) => (
                            <Card key={index}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                                     <card.icon className={cn("h-4 w-4 text-muted-foreground", card.color)} />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{card.value}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {reportData.total > 0 ? `${((card.value / reportData.total) * 100).toFixed(1)}% del total` : ''}
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
                                <div>
                                    <ChartContainer config={{}} className="h-[250px] w-full">
                                         <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                                <Pie
                                                    data={reportData.pieData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={renderCustomizedLabel}
                                                    outerRadius={100}
                                                    innerRadius={60}
                                                >
                                                    {reportData.pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </div>
                            </CardContent>
                        </Card>

                         <Card className="lg:col-span-3">
                            <CardHeader>
                                <CardTitle className="font-headline">Detalle de Registros</CardTitle>
                                <CardDescription>Todos los registros de asistencia para los filtros aplicados.</CardDescription>
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
                                        {reportData.details.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{`${item.firefighter.firstName} ${item.firefighter.lastName}`}</TableCell>
                                                <TableCell className="text-muted-foreground">{item.session.title}</TableCell>
                                                <TableCell>
                                                    <Badge className={cn("whitespace-nowrap", getStatusClass(item.status))}>
                                                        {getStatusLabel(item.status)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                 <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No hay datos de asistencia para los filtros seleccionados.</p>
                </div>
            )}

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="font-headline">Generar Reporte en PDF</CardTitle>
                    <CardDescription>Genere un PDF con los datos filtrados actualmente en pantalla.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={generatePdf} disabled={generatingPdf || reportData.total === 0}>
                        {generatingPdf ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        {generatingPdf ? "Generando..." : "Generar PDF"}
                    </Button>
                </CardContent>
            </Card>

        </>
    );
}

    
