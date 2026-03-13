
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Download, Loader2, Filter, Calendar as CalendarIcon } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Sanction, Firefighter } from "@/lib/types";
import { getSanctions, deleteSanction } from "@/services/sanctions.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import AddSanctionDialog from "./_components/add-sanction-dialog";
import EditSanctionDialog from "./_components/edit-sanction-dialog";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function SanctionsPage() {
    const [sanctions, setSanctions] = useState<Sanction[]>([]);
    const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const { toast } = useToast();
    const { getActiveRole } = useAuth();
    const pathname = usePathname();

    // Filters
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterFirefighter, setFilterFirefighter] = useState('all');

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sData, fData] = await Promise.all([getSanctions(), getFirefighters()]);
            setSanctions(sData);
            setFirefighters(fData);
        } catch (error) {
             toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);

    const filteredSanctions = useMemo(() => {
        return sanctions.filter(s => {
            if (filterFirefighter !== 'all' && s.firefighterId !== filterFirefighter) return false;
            if (filterDate?.from) {
                const sDate = parseISO(s.startDate);
                if (!isWithinInterval(sDate, { start: startOfDay(filterDate.from), end: endOfDay(filterDate.to || filterDate.from) })) return false;
            }
            return true;
        });
    }, [sanctions, filterDate, filterFirefighter]);

    const handleDelete = async (sanction: Sanction) => {
        try {
            await deleteSanction(sanction.id);
            toast({ title: "Éxito", description: "La sanción ha sido eliminada." });
            fetchData();
        } catch (error: any) {
             toast({ title: "Error", description: "No se pudo eliminar la sanción.", variant: "destructive" });
        }
    };

    const generatePdf = async () => {
        setGeneratingPdf(true);
        const doc = new jsPDF();
        try {
            doc.setFillColor(34, 43, 54);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text("Reporte de Sanciones", 14, 22);
            
            let currentY = 45;
            doc.setFontSize(10);
            doc.setTextColor(100);
            const dateText = filterDate?.from ? `Desde: ${format(filterDate.from, "P", { locale: es })}` : "Historial Completo";
            doc.text(dateText, 14, currentY);
            currentY += 10;

            (doc as any).autoTable({
                startY: currentY,
                head: [['Bombero', 'Motivo', 'Desde', 'Hasta']],
                body: filteredSanctions.map(s => [
                    s.firefighterName,
                    s.reason,
                    format(parseISO(s.startDate), "P", { locale: es }),
                    format(parseISO(s.endDate), "P", { locale: es })
                ]),
                theme: 'striped',
                headStyles: { fillColor: '#333333' },
            });

            doc.save(`reporte-sanciones-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally {
            setGeneratingPdf(false);
        }
    };

    return (
        <>
            <PageHeader title="Gestión de Sanciones" description="Registre y gestione las sanciones disciplinarias.">
                {canManage && (
                    <AddSanctionDialog onSanctionAdded={fetchData}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Registrar Sanción
                        </Button>
                    </AddSanctionDialog>
                )}
            </PageHeader>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6">
                    <TabsTrigger value="list">Listado</TabsTrigger>
                    <TabsTrigger value="report">Reportes</TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-lg">Sanciones Registradas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bombero</TableHead>
                                        <TableHead>Motivo</TableHead>
                                        <TableHead>Desde</TableHead>
                                        <TableHead>Hasta</TableHead>
                                        {canManage && <TableHead className="text-right">Acciones</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 4 }).map((_, i) => (
                                            <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                        ))
                                    ) : sanctions.length > 0 ? (
                                        sanctions.map((sanction) => (
                                            <TableRow key={sanction.id}>
                                                <TableCell className="font-medium">{sanction.firefighterName}</TableCell>
                                                <TableCell className="max-w-xs truncate">{sanction.reason}</TableCell>
                                                <TableCell>{format(parseISO(sanction.startDate), "P", { locale: es })}</TableCell>
                                                <TableCell>{format(parseISO(sanction.endDate), "P", { locale: es })}</TableCell>
                                                {canManage && (
                                                    <TableCell className="text-right">
                                                        <AlertDialog>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <EditSanctionDialog sanction={sanction} onSanctionUpdated={fetchData}>
                                                                        <DropdownMenuItem onSelect={e => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                                                                    </EditSanctionDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem className='text-destructive' onSelect={e => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>¿Eliminar sanción?</AlertDialogTitle>
                                                                    <AlertDialogDescription>Esta acción es permanente.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDelete(sanction)} variant="destructive">Eliminar</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">No hay sanciones registradas.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="report">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5"/> Filtros</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Mes de Inicio</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filterDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filterDate?.from ? format(filterDate.from, "MMMM yyyy", { locale: es }) : "Cualquier mes"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={filterDate?.from} onSelect={(d) => setFilterDate(d ? { from: d, to: d } : undefined)} locale={es} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Bombero</Label>
                                    <Select value={filterFirefighter} onValueChange={setFilterFirefighter}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            {firefighters.map(f => <SelectItem key={f.id} value={f.id}>{f.legajo} - {f.lastName}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t pt-4">
                                <Button onClick={generatePdf} disabled={generatingPdf || filteredSanctions.length === 0}>
                                    {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                    Generar Reporte PDF ({filteredSanctions.length})
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </>
    )
}
