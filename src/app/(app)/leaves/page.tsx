
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Download, Loader2, Calendar as CalendarIcon, Check, ChevronsUpDown, Filter } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Leave, Firefighter } from "@/lib/types";
import { getLeaves, deleteLeave } from "@/services/leaves.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import AddLeaveDialog from "./_components/add-leave-dialog";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import EditLeaveDialog from "./_components/edit-leave-dialog";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function LeavesPage() {
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const { toast } = useToast();
    const { getActiveRole, user } = useAuth();
    const pathname = usePathname();

    // Filters state
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterFirefighter, setFilterFirefighter] = useState('all');

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [leavesData, firefightersData] = await Promise.all([
                getLeaves(),
                getFirefighters()
            ]);
            setLeaves(leavesData);
            setFirefighters(firefightersData);
        } catch (error) {
             toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);

    const filteredLeaves = useMemo(() => {
        return leaves.filter(leave => {
            if (filterFirefighter !== 'all' && leave.firefighterId !== filterFirefighter) return false;
            if (filterDate?.from) {
                const leaveStart = startOfDay(parseISO(leave.startDate));
                const leaveEnd = endOfDay(parseISO(leave.endDate));
                const rangeStart = startOfDay(filterDate.from);
                const rangeEnd = endOfDay(filterDate.to ?? filterDate.from);
                if (leaveStart > rangeEnd || leaveEnd < rangeStart) return false;
            }
            return true;
        });
    }, [leaves, filterDate, filterFirefighter]);

    const handleDataChange = () => {
        fetchData();
    };

    const handleDelete = async (leaveId: string) => {
        try {
            await deleteLeave(leaveId);
            toast({ title: "Éxito", description: "La licencia ha sido eliminada." });
            fetchLeaves();
        } catch (error: any) {
             toast({ title: "Error", description: error.message || "No se pudo eliminar la licencia.", variant: "destructive" });
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
            doc.text("Reporte de Licencias", 14, 22);
            
            let currentY = 45;
            doc.setFontSize(10);
            doc.setTextColor(100);
            const dateText = filterDate?.from 
                ? `Período: ${format(filterDate.from, "P", { locale: es })} - ${format(filterDate.to ?? filterDate.from, "P", { locale: es })}`
                : "Período: Todos los registros";
            doc.text(dateText, 14, currentY);
            currentY += 10;

            (doc as any).autoTable({
                startY: currentY,
                head: [['Bombero', 'Tipo', 'Desde', 'Hasta']],
                body: filteredLeaves.map(l => [
                    l.firefighterName,
                    l.type,
                    format(parseISO(l.startDate), "P", { locale: es }),
                    format(parseISO(l.endDate), "P", { locale: es })
                ]),
                theme: 'striped',
                headStyles: { fillColor: '#333333' },
            });

            doc.save(`reporte-licencias-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally {
            setGeneratingPdf(false);
        }
    };

    return (
        <>
            <PageHeader title="Gestión de Licencias" description="Registre y gestione las licencias de los integrantes.">
                {canManage && (
                    <AddLeaveDialog onLeaveAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Registrar Licencia
                        </Button>
                    </AddLeaveDialog>
                )}
            </PageHeader>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6">
                    <TabsTrigger value="list">Listado Actual</TabsTrigger>
                    <TabsTrigger value="report">Reportes y Filtros</TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-lg">Licencias Registradas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bombero</TableHead>
                                        <TableHead>Tipo</TableHead>
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
                                    ) : leaves.length > 0 ? (
                                        leaves.map((leave) => (
                                            <TableRow key={leave.id}>
                                                <TableCell className="font-medium">{leave.firefighterName}</TableCell>
                                                <TableCell>{leave.type}</TableCell>
                                                <TableCell>{format(parseISO(leave.startDate), "P", { locale: es })}</TableCell>
                                                <TableCell>{format(parseISO(leave.endDate), "P", { locale: es })}</TableCell>
                                                {canManage && (
                                                    <TableCell className="text-right">
                                                        <AlertDialog>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <EditLeaveDialog leave={leave} onLeaveUpdated={handleDataChange}>
                                                                        <DropdownMenuItem onSelect={e => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                                                                    </EditLeaveDialog>
                                                                    <DropdownMenuSeparator />
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem className='text-destructive focus:text-destructive' onSelect={e => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                                                    <AlertDialogDescription>Esta acción eliminará permanentemente el registro de licencia para {leave.firefighterName}.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDelete(leave.id)} variant="destructive">Eliminar</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">No hay licencias registradas.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="report">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5"/> Filtros de Búsqueda</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Rango de Fechas</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !filterDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filterDate?.from ? (filterDate.to ? (<>{format(filterDate.from, "P", { locale: es })} - {format(filterDate.to, "P", { locale: es })}</>) : (format(filterDate.from, "P", { locale: es }))) : (<span>Cualquier fecha</span>)}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar initialFocus mode="range" defaultMonth={filterDate?.from} selected={filterDate} onSelect={setFilterDate} numberOfMonths={2} locale={es} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Bombero</Label>
                                    <Select value={filterFirefighter} onValueChange={setFilterFirefighter}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los bomberos</SelectItem>
                                            {firefighters.map(f => <SelectItem key={f.id} value={f.id}>{f.legajo} - {f.lastName}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t pt-4">
                                <Button onClick={generatePdf} disabled={generatingPdf || filteredLeaves.length === 0}>
                                    {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                    Descargar Reporte PDF ({filteredLeaves.length})
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Vista Previa del Reporte</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Bombero</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Período</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredLeaves.map(l => (
                                            <TableRow key={l.id}>
                                                <TableCell className="font-medium">{l.firefighterName}</TableCell>
                                                <TableCell>{l.type}</TableCell>
                                                <TableCell className="text-xs">{format(parseISO(l.startDate), "P", { locale: es })} al {format(parseISO(l.endDate), "P", { locale: es })}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </>
    )
}
