
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Download, Loader2, Check, ChevronsUpDown, Gauge, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { es } from 'date-fns/locale';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { useState, useEffect, useMemo } from "react";
import { MaintenanceRecord, Vehicle, Specialization } from "@/lib/types";
import { getMaintenanceRecordsByVehicle } from "@/services/maintenance.service";
import { getVehicles } from "@/services/vehicles.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { APP_CONFIG } from "@/lib/config";

const vehicleTypes = ['Liviana', 'Mediana', 'Pesada', 'Cisterna'];
const cuarteles = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'GENERAL'];

export default function MobilityReportsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    const [allRecords, setAllRecords] = useState<MaintenanceRecord[]>([]);
    const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);

    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterVehicle, setFilterVehicle] = useState('all');
    const [filterCuartel, setFilterCuartel] = useState('all');
    const [filterTipo, setFilterTipo] = useState('all');
    const [filterEspecialidad, setFilterEspecialidad] = useState('all');
    const [openCombobox, setOpenCombobox] = useState(false);
    
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const vehiclesData = await getVehicles();
                setAllVehicles(vehiclesData);
                const recordPromises = vehiclesData.map(v => getMaintenanceRecordsByVehicle(v.id));
                const allRecordsArrays = await Promise.all(recordPromises);
                setAllRecords(allRecordsArrays.flat());
            } catch (error) {
                toast({ title: 'Error', description: 'Fallo al cargar datos.' });
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
        fetchInitialData();
        fetchLogo();
    }, [toast]);

    const filteredVehicles = useMemo(() => {
        return allVehicles.filter(v => {
            if (filterCuartel !== 'all' && v.cuartel !== filterCuartel) return false;
            if (filterTipo !== 'all' && v.tipoVehiculo !== filterTipo) return false;
            if (filterEspecialidad !== 'all' && v.especialidad !== filterEspecialidad) return false;
            return true;
        });
    }, [allVehicles, filterCuartel, filterTipo, filterEspecialidad]);

    const filteredRecords = useMemo(() => {
        const filteredVehicleIds = new Set(filteredVehicles.map(v => v.id));
        return allRecords.filter(record => {
            if (!filteredVehicleIds.has(record.vehicleId)) return false;
            if (filterVehicle !== 'all' && record.vehicleId !== filterVehicle) return false;
            if (filterDate?.from) {
                const recordDate = parseISO(record.date);
                if (!isWithinInterval(recordDate, { start: startOfDay(filterDate.from), end: endOfDay(filterDate.to || filterDate.from) })) return false;
            }
            return true;
        }).sort((a,b) => b.date.localeCompare(a.date));
    }, [allRecords, filteredVehicles, filterVehicle, filterDate]);

    const generatePdf = async () => {
        if (!logoDataUrl) return;
        setGeneratingPdf(true);
        const doc = new jsPDF();
        try {
            doc.setFillColor(34, 43, 54);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
            doc.text(`Reporte de Movilidad - ${APP_CONFIG.name}`, 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');
    
            let currentY = 50;
            const PADDING = 14;
            const PAGE_WIDTH = doc.internal.pageSize.getWidth();
            const CONTENT_WIDTH = PAGE_WIDTH - (PADDING * 2);
    
            const recordsByVehicle = filteredRecords.reduce((acc, record) => {
                (acc[record.vehicleId] = acc[record.vehicleId] || []).push(record);
                return acc;
            }, {} as Record<string, MaintenanceRecord[]>);
    
            for (const vehicleId in recordsByVehicle) {
                const vehicle = allVehicles.find(v => v.id === vehicleId);
                const records = recordsByVehicle[vehicleId];
                if (currentY > 240) { doc.addPage(); currentY = 20; }
                doc.setFillColor(52, 58, 64); doc.rect(0, currentY - 5, PAGE_WIDTH, 10, 'F');
                doc.setFontSize(14); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
                doc.text(`Móvil: ${vehicle?.numeroMovil} (${vehicle?.marca})`, PADDING, currentY + 2);
                currentY += 15;
                for (const record of records) {
                    if (currentY > 260) { doc.addPage(); currentY = 20; }
                    doc.setFillColor(248, 249, 250); doc.roundedRect(PADDING, currentY - 5, CONTENT_WIDTH, 5, 3, 3, 'F');
                    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(108, 117, 125);
                    doc.text(`Servicio del ${format(parseISO(record.date), 'P', { locale: es })}`, PADDING + 2, currentY);
                    doc.text(`${record.mileage.toLocaleString()} km`, PAGE_WIDTH - 40, currentY); currentY += 10;
                    if (record.checklist?.length > 0) {
                        (doc as any).autoTable({
                            startY: currentY, head: [['Realizado', 'Ítem de Mantenimiento']],
                            body: record.checklist.map(i => [i.checked ? 'SI' : 'NO', i.name]),
                            theme: 'plain', styles: { fontSize: 8 }, margin: { left: PADDING + 2 }, headStyles: { fontStyle: 'bold' }
                        });
                        currentY = (doc as any).lastAutoTable.finalY + 8;
                    }
                }
            }
            if (filteredRecords.length === 0) { doc.setFontSize(12); doc.setTextColor(40); doc.text("Sin registros.", 14, currentY); }
            doc.save(`reporte-movilidad-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingPdf(false); }
    };

    return (
        <div className="space-y-8">
            <PageHeader title="Reportes de Movilidad" description="Historial de mantenimiento y estado de la flota." />
            <Card><CardHeader><CardTitle className="font-headline">Filtros Operativos</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                     <div className="space-y-2"><Label>Cuartel</Label><Select value={filterCuartel} onValueChange={setFilterCuartel}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{cuarteles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                     <div className="space-y-2"><Label>Tipo</Label><Select value={filterTipo} onValueChange={setFilterTipo}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{vehicleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                     <div className="space-y-2"><Label>Especialidad</Label><Select value={filterEspecialidad} onValueChange={setFilterEspecialidad}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Móvil</Label><Popover open={openCombobox} onOpenChange={setOpenCombobox}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between h-10 text-xs truncate">{filterVehicle !== 'all' ? allVehicles.find(v => v.id === filterVehicle)?.numeroMovil : "Todos"}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="p-0"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty><CommandGroup><CommandItem onSelect={() => {setFilterVehicle('all'); setOpenCombobox(false);}}>Todos</CommandItem>{filteredVehicles.map(v => <CommandItem key={v.id} onSelect={() => {setFilterVehicle(v.id); setOpenCombobox(false);}}>{v.numeroMovil} - {v.marca}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>
                    <div className="space-y-2"><Label>Período</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-xs h-10"><CalendarIcon className="mr-2 h-4 w-4" />{filterDate?.from ? format(filterDate.from, "P", {locale: es}) : "Cualquier fecha"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="range" selected={filterDate} onSelect={setFilterDate} locale={es} /></PopoverContent></Popover></div>
                </CardContent>
            </Card>
            <Card shadow-md><CardHeader><CardTitle className="font-headline text-lg">Historial Operativo</CardTitle><CardDescription>Visualizando {filteredRecords.length} servicios registrados.</CardDescription></CardHeader>
                <CardContent>{filteredRecords.length > 0 ? (<Accordion type="single" collapsible className="w-full">{filteredRecords.map(record => { const vehicle = allVehicles.find(v => v.id === record.vehicleId); return (<AccordionItem key={record.id} value={record.id}><AccordionTrigger><div className="flex justify-between w-full pr-4 text-left font-semibold"><span>Móvil {vehicle?.numeroMovil} - {format(parseISO(record.date), 'P', { locale: es })}</span><span className="text-sm text-muted-foreground">{record.mileage.toLocaleString()} km</span></div></AccordionTrigger><AccordionContent className="p-4 bg-muted/30 rounded-b-lg"><div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">{record.checklist?.map((item, i) => (<div key={i} className="flex items-center gap-2">{item.checked ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-400" />}<span>{item.name}</span></div>))}</div>{record.observations && <p className="text-sm mt-4 italic border-l-2 pl-3">"{record.observations}"</p>}</AccordionContent></AccordionItem>) })}</Accordion>) : (<div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg bg-muted/10"><p className="text-muted-foreground italic">Sin registros para la selección actual.</p></div>)}</CardContent>
                <CardFooter className="border-t pt-6"><Button onClick={generatePdf} disabled={generatingPdf || filteredRecords.length === 0} size="lg">{generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Descargar Reporte PDF</Button></CardFooter>
            </Card>
        </div>
    );
}
