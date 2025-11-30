
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Download, Loader2, Siren, Check, ChevronsUpDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { es } from 'date-fns/locale';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, formatDistance } from 'date-fns';
import { useState, useEffect, useMemo } from "react";
import { Service, ServiceType, Vehicle } from "@/lib/types";
import { getServices } from "@/services/services.service";
import { getVehicles } from "@/services/vehicles.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList, CommandGroup } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

const serviceTypes: ServiceType[] = ['Incendio', 'Rescate', 'Accidente', 'HazMat', 'Forestal', 'Especial', 'Otros'];
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


export default function ServicesReportPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    // Raw Data
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
    
    // Filters
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterServiceTypes, setFilterServiceTypes] = useState<string[]>([]);
    const [filterCuarteles, setFilterCuarteles] = useState<string[]>([]);
    const [filterZones, setFilterZones] = useState<string[]>([]);
    const [filterVehicles, setFilterVehicles] = useState<string[]>([]);
    const [filterServiceCodes, setFilterServiceCodes] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [servicesData, vehiclesData] = await Promise.all([
                    getServices(),
                    getVehicles()
                ]);
                setAllServices(servicesData);
                setAllVehicles(vehiclesData);
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
                reader.onloadend = () => { setLogoDataUrl(reader.result as string); };
                reader.readAsDataURL(blob);
             } catch (error) {
                 console.error("Failed to load logo for PDF", error);
             }
        }
        fetchData();
        fetchLogo();
    }, [toast]);

    const filteredServices = useMemo(() => {
        return allServices.filter(service => {
            if (filterServiceTypes.length > 0 && !filterServiceTypes.includes(service.serviceType)) return false;
            if (filterCuarteles.length > 0 && !filterCuarteles.includes(service.cuartel)) return false;
            if (filterZones.length > 0 && !filterZones.includes(service.zone.toString())) return false;
            if (filterServiceCodes.length > 0 && !filterServiceCodes.includes(service.serviceCode)) return false;
            if (filterVehicles.length > 0 && !service.interveningVehicles?.some(iv => filterVehicles.includes(iv.vehicleId))) return false;

            if (filterDate?.from) {
                const serviceDate = parseISO(service.startDateTime);
                const toDate = filterDate.to ?? filterDate.from;
                if (!isWithinInterval(serviceDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return false;
            }
            return true;
        });
    }, [allServices, filterDate, filterServiceTypes, filterCuarteles, filterZones, filterVehicles, filterServiceCodes]);
    
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

    const generatePdf = async () => {
        if (!logoDataUrl) {
            toast({ title: "Espere un momento", description: "El logo para el PDF aún se está cargando.", variant: "destructive" });
            return;
        }
        setGeneratingPdf(true);
        const doc = new jsPDF();
        try {
            doc.setFillColor(220, 53, 69);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text("Reporte de Servicios", 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');
            
            let currentY = 50;

            const getServiceId = (service: Service) => `${service.cuartel}-${service.year.toString().slice(-2)}/${service.manualId.toString().padStart(3, '0')}`;
            const getTotalHours = (start?: string, end?: string) => {
                if (!start || !end) return 'N/A';
                const hours = Math.abs(parseISO(end).getTime() - parseISO(start).getTime()) / 36e5;
                return `${hours.toFixed(1)} hs`;
            };
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
                    format(parseISO(item.startDateTime), 'P', { locale: es }),
                    item.address,
                    getTotalHours(item.startDateTime, item.endDateTime),
                    getVehicleUsageHours(item),
                ]),
                theme: 'striped',
                headStyles: { fillColor: '#333333' },
            });
            doc.save(`reporte-servicios-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({ title: "Error al generar PDF", description: "Hubo un problema al crear el archivo PDF.", variant: "destructive" });
        } finally {
            setGeneratingPdf(false);
        }
    };
    
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent < 0.05) return null;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    if (loading) {
        return (
            <>
                <PageHeader title="Reportes de Servicios" description="Generando reportes..." />
                <Skeleton className="w-full h-[600px]" />
            </>
        )
    }

    const getServiceId = (service: Service) => `${service.cuartel}-${service.year.toString().slice(-2)}/${service.manualId.toString().padStart(3, '0')}`;

    const getTotalHours = (start?: string, end?: string) => {
        if (!start || !end) return 'N/A';
        const hours = Math.abs(parseISO(end).getTime() - parseISO(start).getTime()) / 36e5;
        return `${hours.toFixed(1)} hs`;
    };

    const getVehicleUsageHours = (service: Service) => {
         const totalMillis = service.interveningVehicles?.reduce((acc, v) => {
            if (v.departureDateTime && v.returnDateTime) {
                return acc + Math.abs(parseISO(v.returnDateTime).getTime() - parseISO(v.departureDateTime).getTime());
            }
            return acc;
        }, 0) || 0;
         return (totalMillis / 36e5).toFixed(1);
    };

    return (
        <div className="space-y-8">
            <PageHeader title="Reportes de Servicios" description="Filtre y visualice los servicios realizados." />
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Filtros del Reporte</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Rango de Fechas</Label>
                        <Popover>
                            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !filterDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filterDate?.from ? (filterDate.to ? (<>{format(filterDate.from, "LLL dd, y", { locale: es })} - {format(filterDate.to, "LLL dd, y", { locale: es })}</>) : (format(filterDate.from, "LLL dd, y", { locale: es }))) : (<span>Todos</span>)}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={filterDate?.from} selected={filterDate} onSelect={setFilterDate} numberOfMonths={2} locale={es} /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Tipo de Servicio</Label>
                        <MultiSelectFilter title="Tipos" options={serviceTypes.map(t => ({ value: t, label: t }))} selected={filterServiceTypes} onSelectedChange={setFilterServiceTypes} />
                    </div>
                     <div className="space-y-2">
                        <Label>Cuartel</Label>
                         <MultiSelectFilter title="Cuarteles" options={cuarteles.map(t => ({ value: t, label: t }))} selected={filterCuarteles} onSelectedChange={setFilterCuarteles} />
                    </div>
                     <div className="space-y-2">
                        <Label>Zona</Label>
                         <MultiSelectFilter title="Zonas" options={zones.map(z => ({ value: z, label: `Zona ${z}` }))} selected={filterZones} onSelectedChange={setFilterZones} />
                    </div>
                     <div className="space-y-2">
                        <Label>Móvil</Label>
                         <MultiSelectFilter title="Móviles" options={allVehicles.map(v => ({ value: v.id, label: v.numeroMovil }))} selected={filterVehicles} onSelectedChange={setFilterVehicles} />
                    </div>
                     <div className="space-y-2">
                        <Label>Código de Servicio</Label>
                         <MultiSelectFilter title="Códigos" options={serviceCodesList.map(c => ({ value: c, label: c }))} selected={filterServiceCodes} onSelectedChange={setFilterServiceCodes} searchPlaceholder="Buscar código..." />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Distribución por Tipo</CardTitle>
                            <CardDescription>Total de servicios: {summaryStats.totalServices}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={{}} className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                        <Pie data={summaryStats.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} labelLine={false} label={renderCustomizedLabel}>
                                            {summaryStats.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        </Pie>
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Detalle de Servicios</CardTitle>
                            <CardDescription>Mostrando {filteredServices.length} servicios con los filtros aplicados.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[400px] overflow-y-auto">
                            <Table>
                                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Tipo</TableHead><TableHead>Fecha</TableHead><TableHead>Duración</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredServices.length > 0 ? (
                                        filteredServices.map((service) => (
                                            <TableRow key={service.id}>
                                                <TableCell className="font-mono">{getServiceId(service)}</TableCell>
                                                <TableCell><Badge style={{ backgroundColor: SERVICE_TYPE_COLORS[service.serviceType] }} className="text-white">{service.serviceType}</Badge></TableCell>
                                                <TableCell>{format(parseISO(service.startDateTime), 'P', { locale: es })}</TableCell>
                                                <TableCell>{getTotalHours(service.startDateTime, service.endDateTime)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={4} className="h-24 text-center">No se encontraron servicios.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Exportar Reporte</CardTitle>
                    <CardDescription>Genere un archivo PDF con los resultados filtrados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={generatePdf} disabled={generatingPdf || filteredServices.length === 0}>
                        {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {generatingPdf ? "Generando..." : "Generar PDF"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
