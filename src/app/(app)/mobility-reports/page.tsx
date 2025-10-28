
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Download, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { es } from 'date-fns/locale';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { useState, useEffect, useMemo } from "react";
import { MaintenanceRecord, Vehicle } from "@/lib/types";
import { getMaintenanceRecordsByVehicle } from "@/services/maintenance.service";
import { getVehicles } from "@/services/vehicles.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";


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
    const [openCombobox, setOpenCombobox] = useState(false);
    
    // Fetch all vehicles once for the filter dropdown
    useEffect(() => {
        getVehicles().then(setAllVehicles).catch(() => toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los móviles.' }));
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
        fetchLogo();
    }, [toast]);

    // Fetch records when the selected vehicle filter changes
    useEffect(() => {
        const fetchRecords = async () => {
            if (filterVehicle === 'all') {
                setAllRecords([]); // Or fetch all records if desired
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const recordsData = await getMaintenanceRecordsByVehicle(filterVehicle);
                setAllRecords(recordsData);
            } catch (error) {
                toast({ title: "Error", description: "No se pudieron cargar los registros de mantenimiento.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchRecords();
    }, [filterVehicle, toast]);

    const filteredRecords = useMemo(() => {
        if (!filterDate?.from) return allRecords;
        return allRecords.filter(record => {
            const recordDate = parseISO(record.date);
            const toDate = filterDate.to ?? filterDate.from;
            return isWithinInterval(recordDate, { start: startOfDay(filterDate.from!), end: endOfDay(toDate) });
        });
    }, [allRecords, filterDate]);

    const generatePdf = async () => {
        if (!logoDataUrl) {
            toast({ title: "Espere un momento", description: "El logo para el PDF aún se está cargando.", variant: "destructive" });
            return;
        }

        const selectedVehicle = allVehicles.find(v => v.id === filterVehicle);
        if (!selectedVehicle) return;

        setGeneratingPdf(true);
        const doc = new jsPDF();
        
        try {
            // PDF Header
            doc.setFillColor(220, 53, 69);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text(`Reporte de Mantenimiento - Móvil ${selectedVehicle.numeroMovil}`, 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');

            let currentY = 50;

            for (const record of filteredRecords) {
                if (currentY > 250) { doc.addPage(); currentY = 20; }
                
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(`Servicio del ${format(parseISO(record.date), 'P', { locale: es })} - ${record.mileage.toLocaleString('es-AR')} km`, 14, currentY);
                currentY += 10;
                
                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Item del Checklist', 'Estado']],
                    body: record.checklist.map(item => [item.name, item.checked ? 'Realizado' : 'No Realizado']),
                    theme: 'striped',
                    headStyles: { fillColor: '#6c757d' },
                });
                currentY = (doc as any).lastAutoTable.finalY;

                if (record.observations) {
                    currentY += 5;
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Observaciones:', 14, currentY);
                    currentY += 5;
                    doc.setFont('helvetica', 'normal');
                    const splitText = doc.splitTextToSize(record.observations, 180);
                    doc.text(splitText, 14, currentY);
                    currentY += (splitText.length * 5);
                }
                currentY += 10; // Space between records
            }

            if (filteredRecords.length === 0) {
                 doc.text("No se encontraron registros para los filtros aplicados.", 14, currentY);
            }

            doc.save(`reporte-movil-${selectedVehicle.numeroMovil}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({ title: "Error al generar PDF", description: "Hubo un problema al crear el archivo PDF.", variant: "destructive" });
        } finally {
            setGeneratingPdf(false);
        }
    };

    return (
        <>
            <PageHeader title="Reportes de Movilidad" description="Genere y exporte el historial de mantenimiento de cada móvil." />

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="font-headline">Filtros del Reporte</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label>Móvil</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={openCombobox} className="w-full justify-between">
                                    {filterVehicle !== 'all' ? allVehicles.find(v => v.id === filterVehicle)?.numeroMovil : "Seleccionar móvil..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar móvil..." />
                                    <CommandList>
                                        <CommandEmpty>No se encontró el móvil.</CommandEmpty>
                                        {allVehicles.map((vehicle) => (
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

             {filterVehicle !== 'all' ? (
                loading ? <Skeleton className="h-64 w-full" /> :
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Historial de Mantenimiento</CardTitle>
                        <CardDescription>Mostrando {filteredRecords.length} registros para el móvil seleccionado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredRecords.length > 0 ? (
                           <div className="space-y-4">
                                {filteredRecords.map(record => (
                                    <details key={record.id} className="border p-4 rounded-lg">
                                        <summary className="font-semibold cursor-pointer">
                                            Servicio del {format(parseISO(record.date), 'P', { locale: es })} ({record.mileage.toLocaleString('es-AR')} km)
                                        </summary>
                                        <div className="mt-4 pl-4 border-l-2">
                                            <h4 className="font-semibold text-sm mb-2">Checklist:</h4>
                                            <ul className="list-disc pl-5 text-sm space-y-1">
                                                {record.checklist.map(item => (
                                                    <li key={item.name} className={item.checked ? '' : 'text-muted-foreground'}>
                                                        {item.name}: <span className="font-semibold">{item.checked ? 'Realizado' : 'No Realizado'}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            {record.observations && (
                                                <>
                                                    <h4 className="font-semibold text-sm mt-4 mb-2">Observaciones:</h4>
                                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.observations}</p>
                                                </>
                                            )}
                                        </div>
                                    </details>
                                ))}
                           </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No hay registros de mantenimiento para este móvil en el período seleccionado.</p>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Por favor, seleccione un móvil para ver su historial.</p>
                </div>
            )}
            
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="font-headline">Exportar Reporte</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button onClick={generatePdf} disabled={generatingPdf || filterVehicle === 'all' || filteredRecords.length === 0}>
                        {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {generatingPdf ? "Generando..." : "Generar PDF"}
                    </Button>
                </CardContent>
            </Card>
        </>
    );
}
