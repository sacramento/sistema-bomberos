

'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Download, Loader2, Siren } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { es } from 'date-fns/locale';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { useState, useEffect, useMemo } from "react";
import { Service, ServiceType } from "@/lib/types";
import { getServices } from "@/services/services.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts";

const serviceTypes: ServiceType[] = ['Incendio', 'Rescate', 'Accidente', 'HazMat', 'Forestal', 'Especial', 'Otros'];
const cuarteles = ['C1', 'C2', 'C3'];
const zones = Array.from({ length: 12 }, (_, i) => (i + 1).toString());

const SERVICE_TYPE_COLORS: Record<ServiceType, string> = {
    'Incendio': "#EF4444", 
    'Rescate': "#3B82F6",
    'Accidente': "#F97316",
    'HazMat': "#A855F7",
    'Forestal': "#22C55E",
    'Especial': "#6366F1",
    'Otros': "#64748B",
};

export default function ServicesReportPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    // Raw Data
    const [allServices, setAllServices] = useState<Service[]>([]);
    
    // Filters
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterServiceType, setFilterServiceType] = useState('all');
    const [filterCuartel, setFilterCuartel] = useState('all');
    const [filterZone, setFilterZone] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const servicesData = await getServices();
                setAllServices(servicesData);
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
            if (filterServiceType !== 'all' && service.serviceType !== filterServiceType) return false;
            if (filterCuartel !== 'all' && service.cuartel !== filterCuartel) return false;
            if (filterZone !== 'all' && service.zone.toString() !== filterZone) return false;
            if (filterDate?.from) {
                const serviceDate = parseISO(service.date);
                const toDate = filterDate.to ?? filterDate.from;
                if (!isWithinInterval(serviceDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return false;
            }
            return true;
        });
    }, [allServices, filterDate, filterServiceType, filterCuartel, filterZone]);
    
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

            (doc as any).autoTable({
                startY: currentY,
                head: [['ID Servicio', 'Tipo', 'Fecha', 'Dirección', 'Cuartel', 'Zona']],
                body: filteredServices.map(item => [
                    getServiceId(item),
                    item.serviceType,
                    item.date,
                    item.address,
                    item.cuartel,
                    item.zone
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

    return (
        <div className="space-y-8">
            <PageHeader title="Reportes de Servicios" description="Filtre y visualice los servicios realizados." />
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Filtros del Reporte</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label>Rango de Fechas</Label>
                        <Popover>
                            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !filterDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filterDate?.from ? (filterDate.to ? (<>{format(filterDate.from, "LLL dd, y", { locale: es })} - {format(filterDate.to, "LLL dd, y", { locale: es })}</>) : (format(filterDate.from, "LLL dd, y", { locale: es }))) : (<span>Todos</span>)}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={filterDate?.from} selected={filterDate} onSelect={setFilterDate} numberOfMonths={2} locale={es} /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Tipo de Servicio</Label>
                        <Select value={filterServiceType} onValueChange={setFilterServiceType}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{serviceTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Cuartel</Label>
                        <Select value={filterCuartel} onValueChange={setFilterCuartel}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{cuarteles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Zona</Label>
                        <Select value={filterZone} onValueChange={setFilterZone}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent></Select>
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
                                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Tipo</TableHead><TableHead>Fecha</TableHead><TableHead>Dirección</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredServices.length > 0 ? (
                                        filteredServices.map((service) => (
                                            <TableRow key={service.id}>
                                                <TableCell className="font-mono">{getServiceId(service)}</TableCell>
                                                <TableCell><Badge style={{ backgroundColor: SERVICE_TYPE_COLORS[service.serviceType] }} className="text-white">{service.serviceType}</Badge></TableCell>
                                                <TableCell>{service.date}</TableCell>
                                                <TableCell>{service.address}</TableCell>
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
