
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Download, Loader2, Siren, Check, ChevronsUpDown, Search } from "lucide-react";
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

const serviceCodesList = [
    { group: 'Accidente', codes: ['1.1 AEREO', '1.2 EMBARCACIÓN', '1.3 TRÁNSITO', '1.4 OTROS'] },
    { group: 'Fenómeno Natural', codes: ['2.1 CICLÓN', '2.2 TORNADOS Y HURACANES', '2.3 NEVADAS', '2.4 GRANIZO', '2.5 TORMENTAS', '2.6 VOLCÁN', '2.7 AVALANCHA Y ALUD', '2.8 INUNDACIÓN', '2.9 OTROS'] },
    { group: 'Incendio', codes: ['3.1 AERONAVES', '3.2 COMERCIO', '3.3 EMBARCACIÓN', '3.4 ESTABLECIMIENTO EDUCATIVO', '3.5 ESTABLECIMIENTO PÚBLICO', '3.6 FORESTAL', '3.7 HOSPITAL Y CLINICA', '3.8 INDUSTRIA', '3.9 VEHICULO', '3.10 VIVIENDA', '3.11 OTROS'] },
    { group: 'Materiales Peligrosos', codes: ['4.1 ESCAPE O FUGA', '4.2 DERRAME', '4.3 EXPLOSIÓN'] },
    { group: 'Rescate', codes: ['5.1 PERSONAS', '5.2 ANIMALES', '5.3 SERV. DE AMBULANCIA'] },
    { group: 'Servicio Especial', codes: ['6.1 CAPACITACION', '6.2 SERV. ESPECIALES', '6.3 PREVENCIÓN', '6.4 FALSA ALARMA', '6.5 REPRESENTACIÓN', '6.6 FALSO AVISO', '6.7 OTROS', '6.8 SUMINISTRO DE AGUA', '6.9 EXTRACCION DE PANALES', '6.10 RETIRO DE OBITO', '6.11 COLABORACIÓN C/FZAS. DE SEGURIDAD', '6.12 COLOCACIÓN DE DRIZA'] },
].flatMap(group => group.codes);


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
    const [filterServiceCodes, setFilterServiceCodes] = useState<string[]>([]);
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
                toast({ title: "Error", description: "No se pudieron cargar los datos para los reportes.", variant: "destructive" });
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
                 console.error("Failed to load logo for PDF", error);
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
            if (filterServiceCodes.length > 0 && !filterServiceCodes.includes(service.serviceCode)) return false;
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
                const serviceManualId = service.manualId.toString();
                if (!serviceIdString.includes(filterServiceId.toLowerCase()) && !serviceManualId.includes(filterServiceId)) return false;
            }

            if (filterDate?.from && service.startDateTime) {
                const serviceDate = parseISO(service.startDateTime);
                const toDate = filterDate.to ?? filterDate.from;
                if (!isWithinInterval(serviceDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return false;
            }
            return true;
        });
    }, [allServices, filterDate, filterServiceTypes, filterCuarteles, filterZones, filterVehicles, filterServiceCodes, filterFirefighter, filterStationOfficer, filterServiceId]);

    const summaryStats = useMemo(() => {
        const servicesByType = filteredServices.reduce((acc, service) => {
            acc[service.serviceType] = (acc[service.serviceType] || 0) + 1;
            return acc;
        }, {} as Record<ServiceType, number>);

        const pieData = Object.entries(servicesByType).map(([name, value]) => ({
            name,
            value,
            fill: SERVICE_TYPE_COLORS[name as ServiceType] || '#ccc'
        })).filter(item => item.value > 0);

        return {
            totalServices: filteredServices.length,
            pieData
        }
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
            const getVehicleUsageHours = (service: Service) => {
                 const totalMillis = service.interveningVehicles?.reduce((acc, v) => {
                    if (v.departureDateTime && v.returnDateTime) {
                        return acc + Math.abs(parseISO(v.returnDateTime).getTime() - parseISO(v.departureDateTime).getTime());
                    }
                    return acc;
                }, 0) || 0;
                 return (totalMillis / 36e5).toFixed(1);
            };

            (doc as any).autoTable({
                startY: currentY,
                head: [['ID', 'Tipo', 'Fecha', 'Dirección', 'Duración', 'Uso Móviles (hs)']],
                body: filteredServices.map(item => [
                    getServiceId(item),
                    item.serviceType,
                    item.startDateTime ? format(parseISO(item.startDateTime), 'P', { locale: es }) : 'N/A',
                    item.address,
                    formatExactDuration(item.startDateTime, item.endDateTime),
                    getVehicleUsageHours(item),
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
        const pageHeight = doc.internal.pageSize.height;
        const pageMargin = 15;
        const addPageIfNeeded = (y: number) => {
            if (y > pageHeight - 20) {
                doc.addPage();
                return pageMargin;
            }
            return y;
        };

        try {
            filteredServices.forEach((service, index) => {
                doc.setFillColor(220, 53, 69);
                doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
                doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
                doc.text(`Ficha de Servicio - ${APP_CONFIG.name}`, pageMargin, 22);
                doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - (pageMargin + 25), 5, 25, 25);
                
                doc.setFontSize(12); doc.setFont('helvetica', 'normal');
                doc.text(getServiceId(service), pageMargin, 30);

                let currentY = 45;
                doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
                doc.text('Detalles del Servicio', pageMargin, currentY); currentY += 6;
                (doc as any).autoTable({
                    startY: currentY,
                    body: [['Tipo', service.serviceType], ['Código', service.serviceCode], ['Dirección', `${service.address} (Zona: ${service.zone})`], ['Inicio', service.startDateTime ? format(parseISO(service.startDateTime), 'Pp', { locale: es }) : 'N/A'], ['Fin', service.endDateTime ? format(parseISO(service.endDateTime), 'Pp', { locale: es }) : 'N/A']],
                    theme: 'grid', styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
                currentY = addPageIfNeeded(currentY);

                doc.setFontSize(12); doc.text('Personal Interviniente', pageMargin, currentY); currentY += 6;
                const personnelBody = [['Comando', service.command?.legajo || 'N/A'], ['Jefe de Servicio', service.serviceChief?.legajo || 'N/A'], ['Cuartelero', service.stationOfficer?.legajo || 'N/A'], ['Dotación de Servicio', service.onDutyPersonnel?.map(p => p.legajo).join(', ') || 'N/A'], ['Dotación de Pasiva', service.offDutyPersonnel?.map(p => p.legajo).join(', ') || 'N/A']];
                (doc as any).autoTable({
                    startY: currentY, body: personnelBody, theme: 'grid', styles: { fontSize: 9, cellPadding: 2 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
                currentY = addPageIfNeeded(currentY);

                doc.setFontSize(12); doc.text('Móviles Intervinientes', pageMargin, currentY); currentY += 6;
                if (service.interveningVehicles?.length) {
                    (doc as any).autoTable({
                        startY: currentY,
                        head: [['Móvil', 'Salida', 'Regreso', 'Duración']],
                        body: service.interveningVehicles.map(iv => {
                            const vehicle = allVehicles.find(v => v.id === iv.vehicleId);
                            return [vehicle?.numeroMovil || '?', iv.departureDateTime ? format(parseISO(iv.departureDateTime), 'p', { locale: es }) : 'N/A', iv.returnDateTime ? format(parseISO(iv.returnDateTime), 'p', { locale: es }) : 'N/A', formatExactDuration(iv.departureDateTime, iv.returnDateTime)];
                        }),
                        theme: 'striped', headStyles: { fillColor: '#333' }, styles: { fontSize: 9 },
                    });
                    currentY = (doc as any).lastAutoTable.finalY + 10;
                } else {
                    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text('No se registraron móviles.', pageMargin, currentY); currentY += 10;
                }
                currentY = addPageIfNeeded(currentY);

                const addNotesSection = (title: string, content?: string) => {
                    if (!content) return;
                    currentY = addPageIfNeeded(currentY);
                    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text(title, pageMargin, currentY); currentY += 5;
                    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
                    const splitContent = doc.splitTextToSize(content, doc.internal.pageSize.getWidth() - (pageMargin * 2));
                    doc.text(splitContent, pageMargin, currentY);
                    currentY += splitContent.length * 4 + 6;
                }
                addNotesSection('Observaciones', service.observations);
                addNotesSection('Reconocimiento', service.recognition);
                addNotesSection('Colaboración', service.collaboration);

                if (index < filteredServices.length - 1) doc.addPage();
            });
            doc.save(`reporte-servicios-detallado-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({ title: "Error al generar PDF", variant: "destructive" });
        } finally { setGeneratingDetailedPdf(false); }
    };
    
    if (loading) return <Skeleton className="w-full h-[600px]" />;
    
    return (
        <div className="space-y-8">
            <PageHeader title="Reportes de Servicios" description="Filtre y visualice los servicios realizados." />
            <Card><CardHeader><CardTitle className="font-headline">Filtros del Reporte</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Rango de Fechas</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !filterDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filterDate?.from ? format(filterDate.from, "P", {locale: es}) : "Cualquier fecha"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={filterDate?.from} selected={filterDate} onSelect={setFilterDate} numberOfMonths={2} locale={es} /></PopoverContent></Popover></div>
                    <div className="space-y-2"><Label>Buscar por ID</Label><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Ej: 123 ó C1-24/123" className="pl-9" value={filterServiceId} onChange={(e) => setFilterServiceId(e.target.value)} /></div></div>
                    <div className="space-y-2"><Label>Bombero</Label><Popover open={openFirefighterCombobox} onOpenChange={setOpenFirefighterCombobox}>
                        <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-10 text-xs truncate">{filterFirefighter !== 'all' ? allFirefighters.find(f => f.id === filterFirefighter)?.lastName : "Todos"}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button></PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty><CommandGroup><CommandItem onSelect={() => {setFilterFirefighter('all'); setOpenFirefighterCombobox(false);}}>Todos</CommandItem>{allFirefighters.map(f => (<CommandItem key={f.id} onSelect={() => {setFilterFirefighter(f.id); setOpenFirefighterCombobox(false);}}>{f.legajo} - {f.lastName}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
                    </div>
                    <div className="space-y-2"><Label>Tipo de Servicio</Label><MultiSelectFilter title="Tipos" options={serviceTypes.map(t => ({ value: t, label: t }))} selected={filterServiceTypes} onSelectedChange={setFilterServiceTypes} /></div>
                    <div className="space-y-2"><Label>Cuartel</Label><MultiSelectFilter title="Cuarteles" options={cuarteles.map(t => ({ value: t, label: t }))} selected={filterCuarteles} onSelectedChange={setFilterCuarteles} /></div>
                    <div className="space-y-2"><Label>Zona</Label><MultiSelectFilter title="Zonas" options={zones.map(z => ({ value: z, label: `Zona ${z}` }))} selected={filterZones} onSelectedChange={setFilterZones} /></div>
                </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1"><CardHeader><CardTitle className="font-headline">Distribución</CardTitle></CardHeader><CardContent className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={summaryStats.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>{summaryStats.pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
                <Card className="lg:col-span-2"><CardHeader><CardTitle className="font-headline">Detalle de Servicios</CardTitle></CardHeader><CardContent className="max-h-[400px] overflow-y-auto"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Tipo</TableHead><TableHead>Fecha</TableHead><TableHead>Duración</TableHead></TableRow></TableHeader><TableBody>{filteredServices.length > 0 ? filteredServices.map((service) => (<TableRow key={service.id}><TableCell className="font-mono">{getServiceId(service)}</TableCell><TableCell><Badge style={{ backgroundColor: SERVICE_TYPE_COLORS[service.serviceType] }} className="text-white">{service.serviceType}</Badge></TableCell><TableCell>{service.startDateTime ? format(parseISO(service.startDateTime), 'P', { locale: es }) : 'N/A'}</TableCell><TableCell>{formatExactDuration(service.startDateTime, service.endDateTime)}</TableCell></TableRow>)) : (<TableRow><TableCell colSpan={4} className="h-24 text-center">No se encontraron servicios.</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
            </div>
            <Card><CardHeader><CardTitle className="font-headline">Exportar</CardTitle></CardHeader><CardContent className="flex gap-4"><Button onClick={generateSummaryPdf} disabled={generatingSummaryPdf || filteredServices.length === 0}>{generatingSummaryPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} PDF Resumido</Button><Button onClick={generateDetailedPdf} disabled={generatingDetailedPdf || filteredServices.length === 0} variant="secondary">{generatingDetailedPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} PDF Detallado</Button></CardContent></Card>
        </div>
    );
}
