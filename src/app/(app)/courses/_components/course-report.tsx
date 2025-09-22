
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Download, ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { es } from 'date-fns/locale';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { useState, useEffect, useMemo } from "react";
import { Course, Firefighter, Session } from "@/lib/types";
import { getCourses } from "@/services/courses.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const specializations: Session['specialization'][] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE', 'VARIOS'];

export default function CourseReport() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    // Raw Data
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);

    // Filters
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [openCombobox, setOpenCombobox] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [coursesData, firefightersData] = await Promise.all([
                    getCourses(),
                    getFirefighters()
                ]);
                setAllCourses(coursesData);
                setAllFirefighters(firefightersData);

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
    }, [toast]);
    
    const generatePdf = async () => {
        if (!logoDataUrl) {
            toast({ title: "Espere un momento", description: "El logo para el PDF aún se está cargando.", variant: "destructive" });
            return;
        }

        setGeneratingPdf(true);
        const doc = new jsPDF();
        
        try {
            // PDF Header
            doc.setFillColor(220, 53, 69);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text("Reporte de Cursos", 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');

            // Date Filter Info
            doc.setFontSize(11);
            doc.setTextColor(108, 117, 125);
            doc.setFont('helvetica', 'normal');
            const dateText = filterDate?.from ? `Período: ${format(filterDate.from, "P", { locale: es })} - ${format(filterDate.to ?? filterDate.from, "P", { locale: es })}` : "Período: Todos los registros";
            doc.text(dateText, 14, 45);

            let currentY = 55;

            // Details Table
            doc.setFontSize(12);
            doc.setTextColor(40, 40, 40);
            doc.setFont('helvetica', 'bold');
            if(filteredCourses.length > 0) {
                doc.text("Cursos Registrados", 14, currentY);
                currentY += 5;
                 (doc as any).autoTable({
                    startY: currentY,
                    head: [['Bombero', 'Legajo', 'Curso', 'Especialidad', 'Lugar', 'Fechas']],
                    body: filteredCourses.map(item => [
                        item.firefighterName, 
                        item.firefighterLegajo,
                        item.title,
                        item.specialization,
                        item.location,
                        `${format(parseISO(item.startDate), 'P', {locale: es})} - ${format(parseISO(item.endDate), 'P', {locale: es})}`
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: '#333333' },
                });
            } else {
                doc.text("No se encontraron cursos con los filtros aplicados.", 14, currentY);
            }
            doc.save(`reporte-cursos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({ title: "Error al generar PDF", description: "Hubo un problema al crear el archivo PDF.", variant: "destructive" });
        } finally {
            setGeneratingPdf(false);
        }
    };
    
    const filteredCourses = useMemo(() => {
        return allCourses.filter(course => {
            if (filterFirefighter !== 'all' && course.firefighterId !== filterFirefighter) return false;
            if (filterSpecialization !== 'all' && course.specialization !== filterSpecialization) return false;
            if (filterDate?.from) {
                const courseStartDate = startOfDay(parseISO(course.startDate));
                const courseEndDate = endOfDay(parseISO(course.endDate));
                const filterStartDate = startOfDay(filterDate.from);
                const filterEndDate = endOfDay(filterDate.to ?? filterDate.from);
                
                // Check for overlap
                if (courseStartDate > filterEndDate || courseEndDate < filterStartDate) return false;
            }
            return true;
        });
    }, [allCourses, filterDate, filterSpecialization, filterFirefighter]);

    if (loading) {
        return <Skeleton className="w-full h-96" />;
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Filtros del Reporte de Cursos</CardTitle>
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
                        <Label>Especialidad</Label>
                        <Select value={filterSpecialization} onValueChange={setFilterSpecialization}>
                            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las especialidades</SelectItem>
                                {specializations.map(spec => <SelectItem key={spec} value={spec}>{spec}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {filteredCourses.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Resultados del Reporte</CardTitle>
                        <CardDescription>Se encontraron {filteredCourses.length} cursos con los filtros aplicados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bombero</TableHead>
                                    <TableHead className="hidden sm:table-cell">Legajo</TableHead>
                                    <TableHead>Curso</TableHead>
                                    <TableHead className="hidden md:table-cell">Lugar</TableHead>
                                    <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCourses.map((course) => (
                                    <TableRow key={course.id}>
                                        <TableCell className="font-medium">{course.firefighterName}</TableCell>
                                        <TableCell className="hidden sm:table-cell">{course.firefighterLegajo}</TableCell>
                                        <TableCell>{course.title}</TableCell>
                                        <TableCell className="hidden md:table-cell">{course.location}</TableCell>
                                        <TableCell className="hidden lg:table-cell">{format(parseISO(course.startDate), "P", { locale: es })} - {format(parseISO(course.endDate), "P", { locale: es })}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No hay cursos para los filtros seleccionados.</p>
                </div>
            )}
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Exportar Reporte</CardTitle>
                    <CardDescription>Genere un archivo PDF con los resultados de la búsqueda actual.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={generatePdf} disabled={generatingPdf || filteredCourses.length === 0}>
                        {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {generatingPdf ? "Generando..." : "Generar PDF"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

    