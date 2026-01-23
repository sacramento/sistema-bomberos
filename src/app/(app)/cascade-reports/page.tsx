
'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { getCascadeCharges, getCascadeSystemCharges } from '@/services/cascade.service';
import { getMaterials } from '@/services/materials.service';
import { CascadeCharge, CascadeSystemCharge, Material } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Download, Loader2 } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const cuarteles = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
const PIE_CHART_COLORS: Record<string, string> = {
    'Cuartel 1': "#facc15", // yellow-400
    'Cuartel 2': "#3b82f6", // blue-500
    'Cuartel 3': "#22c55e", // green-500
};

const formatDuration = (start: string, end: string) => {
    const minutes = differenceInMinutes(parseISO(end), parseISO(start));
    if (isNaN(minutes) || minutes < 0) return 'N/A';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}min`;
}


export default function CascadeReportsPage() {
    const { toast } = useToast();
    
    // State for ERA Tube Charges
    const [loading, setLoading] = useState(true);
    const [allCharges, setAllCharges] = useState<CascadeCharge[]>([]);
    const [allMaterials, setAllMaterials] = useState<Material[]>([]);
    
    // State for Cascade System Charges
    const [systemCharges, setSystemCharges] = useState<CascadeSystemCharge[]>([]);
    const [systemLoading, setSystemLoading] = useState(true);

    // Common State
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterCuartel, setFilterCuartel] = useState('all');
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [generatingSystemPdf, setGeneratingSystemPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setSystemLoading(true);
            try {
                const [chargesData, materialsData, systemChargesData] = await Promise.all([
                    getCascadeCharges(),
                    getMaterials(),
                    getCascadeSystemCharges()
                ]);
                setAllCharges(chargesData);
                setAllMaterials(materialsData.filter(m => m.tipo === 'RESPIRACIÓN'));
                setSystemCharges(systemChargesData);
            } catch (error) {
                toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
            } finally {
                setLoading(false);
                setSystemLoading(false);
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
             }
        }

        fetchData();
        fetchLogo();
    }, [toast]);
    
    // Memos for ERA Tube Report
    const filteredCharges = useMemo(() => {
        return allCharges.filter(charge => {
            if (filterCuartel !== 'all' && charge.cuartel !== filterCuartel) return false;
            if (filterDate?.from) {
                const chargeDate = parseISO(charge.chargeTimestamp);
                const toDate = filterDate.to ?? filterDate.from;
                if (!isWithinInterval(chargeDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return false;
            }
            return true;
        });
    }, [allCharges, filterDate, filterCuartel]);
    
    const reportData = useMemo(() => {
        const chargesByTube = filteredCharges.reduce((acc, charge) => {
            acc[charge.materialCode] = (acc[charge.materialCode] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const chargesByCuartel = filteredCharges.reduce((acc, charge) => {
            acc[charge.cuartel] = (acc[charge.cuartel] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const pieData = Object.entries(chargesByCuartel).map(([name, value]) => ({
            name, value, fill: PIE_CHART_COLORS[name] || '#ccc'
        }));

        const tableData = allMaterials.map(material => ({
            code: material.codigo,
            cuartel: material.cuartel,
            chargeCount: chargesByTube[material.codigo] || 0,
        })).filter(item => item.chargeCount > 0).sort((a,b) => b.chargeCount - a.chargeCount);
        
        return { tableData, pieData, totalCharges: filteredCharges.length };
    }, [filteredCharges, allMaterials]);

    // Memos for Cascade System Report
    const filteredSystemCharges = useMemo(() => {
        return systemCharges.filter(charge => {
            if (filterCuartel !== 'all' && charge.cuartel !== filterCuartel) return false;
            if (filterDate?.from) {
                const chargeStartDate = parseISO(charge.startTime);
                const toDate = filterDate.to ?? filterDate.from;
                if (!isWithinInterval(chargeStartDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return false;
            }
            return true;
        });
    }, [systemCharges, filterDate, filterCuartel]);

    // PDF Generations
    const generatePdf = async () => { /* ... existing implementation ... */ };
    
    const generateSystemPdf = async () => {
        if (!logoDataUrl) {
            toast({ title: "Espere un momento", description: "El logo para el PDF aún se está cargando.", variant: "destructive" });
            return;
        }

        setGeneratingSystemPdf(true);
        const doc = new jsPDF();

        try {
            doc.setFillColor(34, 43, 54);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text("Reporte de Carga de Sistema de Cascada", 14, 22);
            doc.addImage(logoDataUrl, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');
            
            let currentY = 45;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            const dateText = filterDate?.from ? `Período: ${format(filterDate.from, "P", { locale: es })} - ${format(filterDate.to ?? filterDate.from, "P", { locale: es })}` : "Período: Todos los registros";
            const cuartelText = `Cuartel: ${filterCuartel === 'all' ? 'Todos' : filterCuartel}`;
            doc.text(dateText, 14, currentY);
            currentY += 5;
            doc.text(cuartelText, 14, currentY);
            currentY += 10;
            
            if (filteredSystemCharges.length > 0) {
                 (doc as any).autoTable({
                    startY: currentY,
                    head: [['Cuartel', 'Tubos', 'Inicio', 'Fin', 'Duración', 'Registrado por']],
                    body: filteredSystemCharges.map(item => [
                        item.cuartel,
                        item.tubes.join(', '),
                        format(parseISO(item.startTime), 'Pp', { locale: es }),
                        format(parseISO(item.endTime), 'Pp', { locale: es }),
                        formatDuration(item.startTime, item.endTime),
                        item.actorName
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: '#343a40' },
                });
            } else {
                 doc.setFontSize(12);
                 doc.setTextColor(0);
                 doc.text("No se encontraron registros con los filtros aplicados.", 14, currentY);
            }
            
            doc.save(`reporte-cascada-sistema-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({ title: "Error al generar PDF", description: "Hubo un problema al crear el archivo PDF.", variant: "destructive" });
        } finally {
            setGeneratingSystemPdf(false);
        }
    };


    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent === 0) return null;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill={'#fff'} textAnchor="middle" dominantBaseline="central" className="text-base font-bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="space-y-8">
            <PageHeader title="Reportes de Cascada" description="Estadísticas de uso y recarga de equipos de respiración." />
            
            <Tabs defaultValue="tubosERA" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                    <TabsTrigger value="tubosERA">Reporte de Tubos ERA</TabsTrigger>
                    <TabsTrigger value="cascada">Reporte de Carga de Cascada</TabsTrigger>
                </TabsList>
                
                <TabsContent value="tubosERA" className="mt-6 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Filtros del Reporte de Tubos ERA</CardTitle>
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
                                <Label>Cuartel</Label>
                                <Select value={filterCuartel} onValueChange={setFilterCuartel}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los Cuarteles</SelectItem>
                                        {cuarteles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Cargas por Cuartel</CardTitle>
                                    <CardDescription>Total de cargas: {reportData.totalCharges}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%"><PieChart><ChartTooltip content={<ChartTooltipContent hideLabel />} /><Pie data={reportData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={100} innerRadius={60}>{reportData.pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}</Pie><Legend /></PieChart></ResponsiveContainer>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader><CardTitle className="font-headline">Detalle de Cargas por Tubo</CardTitle></CardHeader>
                                <CardContent className="max-h-[400px] overflow-y-auto">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Tubo (Código)</TableHead><TableHead>Cuartel</TableHead><TableHead>Nº de Cargas</TableHead></TableRow></TableHeader>
                                        <TableBody>{loading ? (Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-5 w-full" /></TableCell></TableRow>))) : reportData.tableData.length > 0 ? (reportData.tableData.map((item) => (<TableRow key={item.code}><TableCell className="font-mono font-medium">{item.code}</TableCell><TableCell>{item.cuartel}</TableCell><TableCell className="font-bold">{item.chargeCount}</TableCell></TableRow>))) : (<TableRow><TableCell colSpan={3} className="h-24 text-center">No se encontraron registros de carga con los filtros aplicados.</TableCell></TableRow>)}</TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Exportar Reporte de Tubos ERA</CardTitle>
                            <CardDescription>Genere un archivo PDF con los resultados filtrados.</CardDescription>
                        </CardHeader>
                        <CardContent><Button onClick={generatePdf} disabled={generatingPdf}>{generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} {generatingPdf ? "Generando..." : "Generar PDF"}</Button></CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="cascada" className="mt-6 space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Historial de Cargas de Cascada</CardTitle>
                             <CardDescription>Mostrando {filteredSystemCharges.length} registros para los filtros aplicados.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cuartel</TableHead>
                                        <TableHead>Tubos Cargados</TableHead>
                                        <TableHead>Inicio</TableHead>
                                        <TableHead>Fin</TableHead>
                                        <TableHead>Duración</TableHead>
                                        <TableHead>Registrado por</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {systemLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                        ))
                                    ) : filteredSystemCharges.length > 0 ? (
                                        filteredSystemCharges.map(charge => (
                                            <TableRow key={charge.id}>
                                                <TableCell>{charge.cuartel}</TableCell>
                                                <TableCell><div className="flex flex-wrap gap-1">{charge.tubes.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}</div></TableCell>
                                                <TableCell>{format(parseISO(charge.startTime), 'Pp', { locale: es })}</TableCell>
                                                <TableCell>{format(parseISO(charge.endTime), 'Pp', { locale: es })}</TableCell>
                                                <TableCell>{formatDuration(charge.startTime, charge.endTime)}</TableCell>
                                                <TableCell>{charge.actorName}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={6} className="h-24 text-center">No se encontraron registros de carga del sistema.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Exportar Reporte de Sistema de Cascada</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={generateSystemPdf} disabled={generatingSystemPdf || filteredSystemCharges.length === 0}>
                                {generatingSystemPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                {generatingSystemPdf ? "Generando..." : "Generar PDF"}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
