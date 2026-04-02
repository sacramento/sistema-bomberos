
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Download, Loader2, Siren, Check, ChevronsUpDown, Search, BarChart3, List } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { es } from 'date-fns/locale';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, differenceInMinutes } from 'date-fns';
import { useState, useEffect, useMemo } from "react";
import { Service, ServiceType, Vehicle, Firefighter } from "@/lib/types";
import { getServices } from "@/services/services.service";
import { getVehicles } from "@/services/vehicles.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList, CommandGroup } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_CONFIG } from "@/lib/config";


const serviceTypes: ServiceType[] = ['Incendio', 'Rescate', 'Accidente', 'HazMat', 'Forestal', 'Especial', 'G.O.R.A', 'Buceo', 'Otros'];
const cuarteles = ['C1', 'C2', 'C3'];
const zones = Array.from({ length: 12 }, (_, i) => (i + 1).toString());

const SERVICE_TYPE_COLORS: Record<ServiceType, string> = {
    'Incendio': "#EF4444", 
    'Rescate': "#3B82F6",
    'Accidente': "#F97316",
    'HazMat': "#A855F7",
    'Forestal': "#22C55E",
    'G.O.R.A': '#8b5cf6', 
    'Buceo': '#0ea5e9', 
    'Especial': "#6366F1",
    'Otros': "#64748B",
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (!percent || percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const MultiSelectFilter = ({
    title,
    options,
    selected,
    onSelectedChange,
    searchPlaceholder,
    renderBadge
}: {
    title: string;
    options: { value: string; label: string }[];
    selected: string[];
    onSelectedChange: (selected: string[]) => void;
    searchPlaceholder?: string;
    renderBadge?: (value: string) => React.ReactNode;
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
    
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-10">
                    <div className="flex gap-1 flex-wrap">
                         {selected.length > 0 ? (
                            selected.map(value => renderBadge ? renderBadge(value) : <Badge variant="secondary" key={value}>{options.find(o => o.value === value)?.label || value}</Badge>)
                        ) : (
                            `Seleccionar ${title.toLowerCase()}...`
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder || `Buscar ${title.toLowerCase()}...`} />
                    <CommandList>
                        <CommandEmpty>No se encontraron opciones.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem key={option.value} value={option.label} onSelect={() => handleSelect(option.value)}>
                                    <Check className={cn("mr-2 h-4 w-4", selected.includes(option.value) ? "opacity-100" : "opacity-0")} />
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

function formatExactDuration(start?: string, end?: string): string {
    if (!start || !end) return 'N/A';
    
    const minutes = differenceInMinutes(parseISO(end), parseISO(start));
    if (isNaN(minutes) || minutes < 0) {
        return 'N/A';
    }
    if (minutes === 0) {
        return '0min';
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    let result = '';
    if (hours > 0) {
        result += `${hours}h `;
    }
    if (remainingMinutes > 0) {
        result += `${remainingMinutes}min`;
    }
    
    return result.trim();
}


export default function ServicesReportPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [generatingSummaryPdf, setGeneratingSummaryPdf] = useState(false);
    const [generatingDetailedPdf, setGeneratingDetailedPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    // Raw Data
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    
    // Filters
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterServiceTypes, setFilterServiceTypes] = useState<string[]>([]);
    const [filterCuarteles, setFilterCuarteles] = useState<string[]>([]);
    const [filterZones, setFilterZones] = useState<string[]>([]);
    const [filterVehicles, setFilterVehicles] = useState<string[]>([]);
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [filterStationOfficer, setFilterStationOfficer] = useState('all');
    const [filterServiceId, setFilterServiceId] = useState('');
    const [openFirefighterCombobox, setOpenFirefighterCombobox] = useState(false);
    const [openStationOfficerCombobox, setOpenStationOfficerCombobox] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [servicesData, vehiclesData, firefightersData] = await Promise.all([
                    getServices(),
                    getVehicles(),
                    getFirefighters(),
                ]);
                setAllServices(servicesData);
                setAllVehicles(vehiclesData);
                setAllFirefighters(firefightersData);
            } catch (error) {
                toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        const fetchLogo = async () => {
             try {
                const response = await fetch(APP_CONFIG.logoUrl);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => { setLogoDataUrl(reader.result as string); };
                reader.readAsDataURL(blob);
             } catch (error) {
                 console.error("Failed to load logo", error);
             }
        }
        fetchData();
        fetchLogo();
    }, [toast]);
    
    const getServiceId = (service: Service) => `${service.cuartel}-${service.year.toString().slice(-2)}/${service.manualId.toString().padStart(3, '0')}`;

    const filteredServices = useMemo(() => {
        return allServices.filter(service => {
            if (filterServiceTypes.length > 0 && !filterServiceTypes.includes(service.serviceType)) return false;
            if (filterCuarteles.length > 0 && !filterCuarteles.includes(service.cuartel)) return false;
            if (filterZones.length > 0 && !filterZones.includes(service.zone.toString())) return false;
            if (filterVehicles.length > 0 && !service.interveningVehicles?.some(iv => filterVehicles.includes(iv.vehicleId))) return false;
            if (filterStationOfficer !== 'all' && service.stationOfficerId !== filterStationOfficer) return false;
            if (filterFirefighter !== 'all') {
                const personnelIds = new Set([
                    service.commandId,
                    service.serviceChiefId,
                    ...(service.onDutyIds || []),
                    ...(service.offDutyIds || [])
                ]);
                if (!personnelIds.has(filterFirefighter)) return false;
            }
            if(filterServiceId) {
                const serviceIdString = getServiceId(service).toLowerCase();
                if (!serviceIdString.includes(filterServiceId.toLowerCase())) return false;
            }

            if (filterDate?.from && service.startDateTime) {
                const serviceDate = parseISO(service.startDateTime);
                const toDate = filterDate.to ?? filterDate.from;
                if (!isWithinInterval(serviceDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return false;
            }
            return true;
        });
    }, [allServices, filterDate, filterServiceTypes, filterCuarteles, filterZones, filterVehicles, filterFirefighter, filterStationOfficer, filterServiceId]);

    const summaryStats = useMemo(() => {
        const stats: Record<string, { count: number, ids: string[] }> = {};
        
        filteredServices.forEach(s => {
            const type = s.serviceType;
            if (!stats[type]) stats[type] = { count: 0, ids: [] };
            stats[type].count++;
            stats[type].ids.push(getServiceId(s));
        });

        const total = filteredServices.length;
        const tableData = Object.entries(stats).map(([type, data]) => ({
            type,
            count: data.count,
            percentage: total > 0 ? (data.count / total) * 100 : 0,
            ids: data.ids.join(', ')
        })).sort((a, b) => b.count - a.count);

        const pieData = tableData.map(item => ({
            name: item.type,
            value: item.count,
            fill: SERVICE_TYPE_COLORS[item.type as ServiceType] || '#ccc'
        }));

        return { totalServices: total, pieData, tableData };
    }, [filteredServices]);
    
    const generateSummaryPdf = async () => {
        if (!logoDataUrl) return;
        setGeneratingSummaryPdf(true);
        const doc = new jsPDF();
        try {
            doc.setFillColor(220, 53, 69);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
            doc.text(`Reporte de Servicios - ${APP_CONFIG.name}`, 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');
            
            let currentY = 50;
            (doc as any).autoTable({
                startY: currentY,
                head: [['ID', 'Tipo', 'Fecha', 'Dirección', 'Duración']],
                body: filteredServices.map(item => [
                    getServiceId(item),
                    item.serviceType,
                    item.startDateTime ? format(parseISO(item.startDateTime), 'P', { locale: es }) : 'N/A',
                    item.address,
                    formatExactDuration(item.startDateTime, item.endDateTime)
                ]),
                theme: 'striped', headStyles: { fillColor: '#333' },
            });
            doc.save(`reporte-servicios-resumen-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingSummaryPdf(false); }
    };
    
    const generateDetailedPdf = async () => {
        if (!logoDataUrl) return;
        setGeneratingDetailedPdf(true);
        const doc = new jsPDF();
        try {
            filteredServices.forEach((service, index) => {
                doc.setFillColor(220, 53, 69);
                doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
                doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
                doc.text(`Ficha de Servicio - ${APP_CONFIG.name}`, 14, 22);
                doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25);
                
                let currentY = 45;
                doc.setFontSize(12); doc.setTextColor(0); doc.text(getServiceId(service), 14, currentY); currentY += 10;
                (doc as any).autoTable({
                    startY: currentY,
                    body: [['Tipo', service.serviceType], ['Dirección', service.address], ['Inicio', service.startDateTime ? format(parseISO(service.startDateTime), 'Pp', { locale: es }) : 'N/A'], ['Fin', service.endDateTime ? format(parseISO(service.endDateTime), 'Pp', { locale: es }) : 'N/A']],
                    theme: 'grid', styles: { fontSize: 10 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
                if (index < filteredServices.length - 1) doc.addPage();
            });
            doc.save(`reporte-servicios-detallado-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingDetailedPdf(false); }
    };
    
    if (loading) return <Skeleton className="w-full h-[600px]" />;
    
    return (
        <div className="space-y-8">
            <PageHeader title="Reportes de Servicios" description="Análisis de intervenciones y estadísticas operativas." />
            <Card><CardHeader><CardTitle className="font-headline">Filtros del Reporte</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Rango de Fechas</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !filterDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filterDate?.from ? format(filterDate.from, "P", {locale: es}) : "Cualquier fecha"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={filterDate?.from} selected={filterDate} onSelect={setFilterDate} numberOfMonths={2} locale={es} /></PopoverContent></Popover></div>
                    <div className="space-y-2"><Label>Buscar por ID</Label><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Ej: C1-24/001" className="pl-9" value={filterServiceId} onChange={(e) => setFilterServiceId(e.target.value)} /></div></div>
                    <div className="space-y-2"><Label>Tipo de Servicio</Label><MultiSelectFilter title="Tipos" options={serviceTypes.map(t => ({ value: t, label: t }))} selected={filterServiceTypes} onSelectedChange={setFilterServiceTypes} /></div>
                    <div className="space-y-2"><Label>Cuartel</Label><MultiSelectFilter title="Cuarteles" options={cuarteles.map(t => ({ value: t, label: t }))} selected={filterCuarteles} onSelectedChange={setFilterCuarteles} /></div>
                    <div className="space-y-2"><Label>Zona</Label><MultiSelectFilter title="Zonas" options={zones.map(z => ({ value: z, label: `Zona ${z}` }))} selected={filterZones} onSelectedChange={setFilterZones} /></div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                    <CardHeader><CardTitle className="font-headline text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Distribución</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={summaryStats.pieData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={80} 
                                    innerRadius={50}
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                >
                                    {summaryStats.pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36}/>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="font-headline text-lg flex items-center gap-2"><List className="h-5 w-5 text-primary" /> Resumen por Tipo</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-center">Cant.</TableHead>
                                    <TableHead className="text-center">%</TableHead>
                                    <TableHead>Nº Planillas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summaryStats.tableData.length > 0 ? summaryStats.tableData.map((row) => (
                                    <TableRow key={row.type}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SERVICE_TYPE_COLORS[row.type as ServiceType] }} />
                                                {row.type}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold">{row.count}</TableCell>
                                        <TableCell className="text-center text-xs text-muted-foreground">{row.percentage.toFixed(1)}%</TableCell>
                                        <TableCell className="text-[10px] text-muted-foreground max-w-[200px] truncate">{row.ids}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center">Sin datos para mostrar.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle className="font-headline text-lg">Historial Detallado</CardTitle></CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Duración</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredServices.length > 0 ? filteredServices.map((service) => (<TableRow key={service.id}><TableCell className="font-mono text-xs">{getServiceId(service)}</TableCell><TableCell><Badge style={{ backgroundColor: SERVICE_TYPE_COLORS[service.serviceType] }} className="text-white text-[10px]">{service.serviceType}</Badge></TableCell><TableCell className="text-xs">{service.startDateTime ? format(parseISO(service.startDateTime), 'P', { locale: es }) : 'N/A'}</TableCell><TableCell className="text-xs">{formatExactDuration(service.startDateTime, service.endDateTime)}</TableCell></TableRow>)) : (<TableRow><TableCell colSpan={4} className="h-24 text-center">No se encontraron servicios.</TableCell></TableRow>)}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card><CardHeader><CardTitle className="font-headline">Exportar Reportes</CardTitle></CardHeader>
                <CardContent className="flex gap-4">
                    <Button onClick={generateSummaryPdf} disabled={generatingSummaryPdf || filteredServices.length === 0}>
                        {generatingSummaryPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
                        PDF Resumido
                    </Button>
                    <Button onClick={generateDetailedPdf} disabled={generatingDetailedPdf || filteredServices.length === 0} variant="secondary">
                        {generatingDetailedPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
                        PDF Detallado
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
