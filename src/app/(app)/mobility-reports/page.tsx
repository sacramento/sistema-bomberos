
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
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE', 'VARIOS'];
const vehicleTypes = ['Liviana', 'Mediana', 'Pesada', 'Cisterna'];
const cuarteles = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

export default function MobilityReportsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    // Raw Data
    const [allRecords, setAllRecords] = useState<MaintenanceRecord[]>([]);
    const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);

    // Filters
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterVehicle, setFilterVehicle] = useState('all');
    const [filterCuartel, setFilterCuartel] = useState('all');
    const [filterTipo, setFilterTipo] = useState('all');
    const [filterEspecialidad, setFilterEspecialidad] = useState('all');
    const [openCombobox, setOpenCombobox] = useState(false);
    
    // Fetch all vehicles and necessary data once
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const vehiclesData = await getVehicles();
                setAllVehicles(vehiclesData);

                const recordPromises = vehiclesData.map(v => getMaintenanceRecordsByVehicle(v.id));
                const allRecordsArrays = await Promise.all(recordPromises);
                const flattenedRecords = allRecordsArrays.flat();
                setAllRecords(flattenedRecords);

            } catch (error) {
                toast({ title: 'Error', description: 'No se pudieron cargar los datos iniciales.' });
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
                const toDate = filterDate.to ?? filterDate.from;
                if (!isWithinInterval(recordDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return false;
            }
            return true;
        }).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [allRecords, filteredVehicles, filterVehicle, filterDate]);

    const generatePdf = async () => {
        if (!logoDataUrl) {
            toast({ title: "Espere un momento", description: "El logo para el PDF aún se está cargando.", variant: "destructive" });
            return;
        }
    
        setGeneratingPdf(true);
        const doc = new jsPDF();
    
        try {
            // PDF Header
            doc.setFillColor(34, 43, 54);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text("Reporte de Mantenimiento", 14, 22);
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
    
                if (currentY > 20) currentY += 5; // Space between vehicle sections
    
                if (currentY > 240) { doc.addPage(); currentY = 20; }
                
                doc.setFillColor(52, 58, 64);
                doc.rect(0, currentY - 5, PAGE_WIDTH, 10, 'F');
                doc.setFontSize(14);
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.text(`Móvil: ${vehicle?.numeroMovil || 'Desconocido'} (${vehicle?.marca} ${vehicle?.modelo})`, PADDING, currentY + 2);
                currentY += 15;

                for (const record of records) {
                    if (currentY > 260) {
                        doc.addPage();
                        currentY = 20;
                    }
                    
                    const recordStartY = currentY;

                    doc.setFillColor(248, 249, 250);
                    doc.roundedRect(PADDING, recordStartY - 5, CONTENT_WIDTH, 5, 3, 3, 'F');

                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(108, 117, 125);
                    doc.text(`Servicio del ${format(parseISO(record.date), 'P', { locale: es })}`, PADDING + 2, currentY);
                    doc.text(`Kilometraje: ${record.mileage.toLocaleString('es-AR')} km`, PAGE_WIDTH / 2, currentY);
                    currentY += 8;
                    
                    if (record.checklist && record.checklist.length > 0) {
                        const COLUMNS = 2;
                        const COLUMN_WIDTH = (CONTENT_WIDTH / COLUMNS) - 5;
                        let itemY = currentY;
                        let maxColHeight = 0;
                        const itemHeightMultiplier = 4;

                        record.checklist.forEach((item, index) => {
                            const col = index % COLUMNS;
                             if (col === 0 && index > 0) {
                                itemY += maxColHeight;
                                maxColHeight = 0;
                            }
                            
                            if (itemY > 270) {
                                doc.addPage();
                                currentY = 20;
                                itemY = 20;
                            }
                            
                            const x = PADDING + 2 + (col * (COLUMN_WIDTH + 5));

                            doc.setFontSize(9);
                            doc.setFont('helvetica', 'bold');
                            doc.setTextColor(item.checked ? 34 : 220, item.checked ? 139 : 53, item.checked ? 34 : 69);
                            doc.text(item.checked ? 'SI' : 'NO', x, itemY);
                            
                            doc.setFontSize(9);
                            doc.setFont('helvetica', 'normal');
                            doc.setTextColor(40, 40, 40);
                            const textLines = doc.splitTextToSize(item.name, COLUMN_WIDTH - 12);
                            doc.text(textLines, x + 8, itemY);
                            
                            const itemHeight = textLines.length * itemHeightMultiplier;
                            maxColHeight = Math.max(maxColHeight, itemHeight);
                        });
                        itemY += maxColHeight;
                        currentY = itemY;
                    }
                    
                    if (record.observations) {
                        currentY += (record.checklist?.length > 0 ? 4 : 0);
                        if (currentY > 270) { doc.addPage(); currentY = 20; }
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(100, 116, 139);
                        doc.text("Observaciones:", PADDING + 2, currentY);
                        currentY += 5;
                        doc.setFontSize(9);
                        doc.setTextColor(40, 40, 40);
                        doc.setFont('helvetica', 'normal');
                        const splitText = doc.splitTextToSize(record.observations, CONTENT_WIDTH - 4);
                        doc.text(splitText, PADDING + 2, currentY);
                        currentY += splitText.length * 3.5 + 4;
                    }

                    if (records.indexOf(record) < records.length - 1) {
                        currentY += 6;
                    }
                }
                 currentY += 5;
            }
    
            if (filteredRecords.length === 0) {
                 doc.setFontSize(12);
                 doc.setTextColor(40,40,40);
                 doc.text("No se encontraron registros para los filtros aplicados.", 14, currentY);
            }
    
            doc.save(`reporte-movilidad-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            console.error(error);
            toast({ title: "Error al generar PDF", description: "Hubo un problema al crear el archivo PDF.", variant: "destructive" });
        } finally {
            setGeneratingPdf(false);
        }
    };


    return (
        <>
            <PageHeader title="Reportes de Movilidad" description="Genere y exporte el historial de mantenimiento de la flota." />

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="font-headline">Filtros del Reporte</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
                     <div className="space-y-2">
                        <Label>Tipo de Unidad</Label>
                        <Select value={filterTipo} onValueChange={setFilterTipo}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Tipos</SelectItem>
                                {vehicleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Especialidad</Label>
                        <Select value={filterEspecialidad} onValueChange={setFilterEspecialidad}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Especialidades</SelectItem>
                                {specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Móvil Específico</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={openCombobox} className="w-full justify-between">
                                    {filterVehicle !== 'all' ? filteredVehicles.find(v => v.id === filterVehicle)?.numeroMovil : "Todos los Móviles"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar móvil..." />
                                    <CommandList>
                                        <CommandEmpty>No se encontró el móvil.</CommandEmpty>
                                        <CommandItem value="all" onSelect={() => {setFilterVehicle('all'); setOpenCombobox(false);}}>
                                            <Check className={cn("mr-2 h-4 w-4", filterVehicle === 'all' ? "opacity-100" : "opacity-0")} />
                                            Todos los Móviles
                                        </CommandItem>
                                        {filteredVehicles.map((vehicle) => (
                                            <CommandItem key={vehicle.id} value={vehicle.numeroMovil} onSelect={() => { setFilterVehicle(vehicle.id); setOpenCombobox(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", filterVehicle === vehicle.id ? "opacity-100" : "opacity-0")} />
                                                {vehicle.numeroMovil} - {vehicle.marca}
                                            </CommandItem>
                                        ))}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Rango de Fechas</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !filterDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDate?.from ? (filterDate.to ? (<>{format(filterDate.from, "LLL dd, y", { locale: es })} - {format(filterDate.to, "LLL dd, y", { locale: es })}</>) : (format(filterDate.from, "LLL dd, y", { locale: es }))) : (<span>Todos los registros</span>)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={filterDate?.from} selected={filterDate} onSelect={setFilterDate} numberOfMonths={2} locale={es} />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>

            {loading ? <Skeleton className="h-96 w-full" /> :
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Resultados del Reporte</CardTitle>
                    <CardDescription>Mostrando {filteredRecords.length} registros para los filtros aplicados.</CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredRecords.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {filteredRecords.map(record => {
                                const vehicle = allVehicles.find(v => v.id === record.vehicleId);
                                return (
                                    <AccordionItem key={record.id} value={record.id}>
                                        <AccordionTrigger>
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full pr-4 text-left">
                                                <div className="font-semibold text-base">Móvil {vehicle?.numeroMovil} - Servicio del {format(parseISO(record.date), 'P', { locale: es })}</div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <Gauge className="h-4 w-4"/> {record.mileage.toLocaleString('es-AR')} km
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="p-4 border-t bg-muted/50 rounded-b-lg">
                                                <h4 className="font-semibold mb-2">Checklist:</h4>
                                                <ul className="space-y-2 mt-4 columns-1 md:columns-2">
                                                    {record.checklist.map((item, index) => (
                                                        <li key={index} className="flex items-center gap-2 text-sm break-inside-avoid">
                                                            {item.checked ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                                                            <span className={item.checked ? 'text-foreground' : 'text-muted-foreground'}>{item.name}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                {record.observations && (
                                                    <>
                                                        <h4 className="font-semibold mt-4 mb-2">Observaciones:</h4>
                                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.observations}</p>
                                                    </>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    ) : (
                        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No hay registros de mantenimiento para los filtros seleccionados.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            }
            
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="font-headline">Exportar Reporte</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button onClick={generatePdf} disabled={generatingPdf || filteredRecords.length === 0}>
                        {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {generatingPdf ? "Generando..." : "Generar PDF"}
                    </Button>
                </CardContent>
            </Card>
        </>
    );
}

    