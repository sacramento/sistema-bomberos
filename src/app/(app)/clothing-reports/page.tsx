
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";
import { ClothingItem, Firefighter } from "@/lib/types";
import { getClothingItems } from "@/services/clothing.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Archive, User, Shirt, Download, Loader2, FileSignature } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

const clothingItemTypes: ClothingItem['type'][] = [
    'Mameluco', 'Borcego', 'Pantalon', 'Remera', 'Tricota',
    'Camisa', 'Campera', 'Gorro', 'Corbata', 'Cinto',
    'Casco', 'Chaqueton', 'Bota', 'Guante', 'Esclavina'
].sort();

const firehouses = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];
const clothingStates: ClothingItem['state'][] = ['Nuevo', 'Bueno', 'Regular', 'Malo', 'Baja'];

const CONDITION_CHART_COLORS: Record<ClothingItem['state'], string> = {
    Nuevo: "#3B82F6",      // blue-500
    Bueno: "#22C55E",      // green-500
    Regular: "#FBBF24",     // yellow-400
    Malo: "#F97316",       // orange-500
    Baja: "#EF4444",      // red-500
};

export default function ClothingReportsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [generatingFicha, setGeneratingFicha] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    // Raw Data
    const [allItems, setAllItems] = useState<ClothingItem[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);

    // Filters
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterCuartel, setFilterCuartel] = useState('all');
    const [filterState, setFilterState] = useState('all');
    const [openCombobox, setOpenCombobox] = useState(false);

    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);
    const isBomberoRole = activeRole === 'Bombero';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [itemsData, firefightersData] = await Promise.all([
                    getClothingItems(),
                    getFirefighters()
                ]);
                setAllItems(itemsData);
                setAllFirefighters(firefightersData);

                if (isBomberoRole && user) {
                    const firefighterUser = firefightersData.find(f => f.legajo === user.id);
                    if(firefighterUser) {
                        setFilterFirefighter(firefighterUser.id);
                    } else {
                        // User is a 'Bombero' but not in the firefighters list, show no data.
                        setFilterFirefighter('__NOT_FOUND__');
                    }
                }
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
             }
        }
        fetchData();
        fetchLogo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toast, user, isBomberoRole]);

    const filteredItems = useMemo(() => {
        return allItems.filter(item => {
            if (filterType !== 'all' && item.type !== filterType) return false;
            if (filterState !== 'all' && item.state !== filterState) return false;

            const firefighter = allFirefighters.find(f => f.id === item.firefighterId);
            
            if (filterCuartel !== 'all') {
                if (!firefighter || firefighter.firehouse !== filterCuartel) {
                    // This handles items in storage ('En Depósito')
                    if (filterCuartel !== 'En Depósito' || item.firefighterId) return false;
                }
            }

            if (filterFirefighter !== 'all' && item.firefighterId !== filterFirefighter) return false;

            return true;
        });
    }, [allItems, allFirefighters, filterType, filterState, filterCuartel, filterFirefighter]);

    const summaryStats = useMemo(() => {
        const itemsInDeposit = filteredItems.filter(item => !item.firefighterId).length;
        const itemsGivenOut = filteredItems.filter(item => !!item.firefighterId).length;
        const itemsDecommissioned = filteredItems.filter(item => item.state === 'Baja').length;

        const conditionCounts = filteredItems.reduce((acc, item) => {
            acc[item.state] = (acc[item.state] || 0) + 1;
            return acc;
        }, {} as Record<ClothingItem['state'], number>);
        
        const pieData = Object.entries(conditionCounts).map(([name, value]) => ({
            name,
            value,
            fill: CONDITION_CHART_COLORS[name as ClothingItem['state']] || '#ccc'
        })).filter(item => item.value > 0);

        return {
            totalItems: filteredItems.length,
            itemsInDeposit,
            itemsGivenOut,
            itemsDecommissioned,
            pieData
        }
    }, [filteredItems]);
    
    const generateGeneralPdf = async () => {
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
            doc.text("Reporte de Ropería", 14, 22);
            doc.addImage(logoDataUrl, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');
            
            let currentY = 50;

            doc.setFontSize(12);
            doc.setTextColor(40, 40, 40);
            doc.text("Detalle de Inventario Filtrado", 14, currentY);
            currentY += 8;

            (doc as any).autoTable({
                startY: currentY,
                head: [['Código', 'Tipo', 'Talle', 'Asignado a', 'Condición']],
                body: filteredItems.map(item => [
                    item.code,
                    item.type,
                    item.size,
                    item.firefighter ? `${item.firefighter.lastName}, ${item.firefighter.firstName}` : 'En Depósito',
                    item.state,
                ]),
                theme: 'striped',
                headStyles: { fillColor: '#333333' },
            });
            
            doc.save(`reporte-roperia-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({ title: "Error al generar PDF", description: "Hubo un problema al crear el archivo PDF.", variant: "destructive" });
        } finally {
            setGeneratingPdf(false);
        }
    }
    
    const generateFichaPdf = async () => {
        const firefighter = allFirefighters.find(f => f.id === filterFirefighter);
        if (!firefighter) {
            toast({ title: "Acción requerida", description: "Seleccione un bombero para generar su ficha.", variant: "destructive" });
            return;
        }
         if (!logoDataUrl) {
            toast({ title: "Espere un momento", description: "El logo para el PDF aún se está cargando.", variant: "destructive" });
            return;
        }

        setGeneratingFicha(true);
        const doc = new jsPDF();
        
        try {
            // Header
            doc.addImage(logoDataUrl, 'PNG', 14, 12, 25, 25);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text("Ficha de Equipamiento Personal", doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
            
            // Firefighter Info
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Bombero:`, 14, 50);
            doc.setFont('helvetica', 'bold');
            doc.text(`${firefighter.firstName} ${firefighter.lastName}`, 38, 50);

            doc.setFont('helvetica', 'normal');
            doc.text(`Legajo:`, 120, 50);
            doc.setFont('helvetica', 'bold');
            doc.text(firefighter.legajo, 140, 50);
            
            // Table
            const body = filteredItems.map(item => [
                item.code,
                `${item.category}/${item.subCategory}`,
                item.type,
                item.size,
                item.state
            ]);

            (doc as any).autoTable({
                startY: 60,
                head: [['Código', 'Categoría', 'Tipo', 'Talle', 'Condición']],
                body: body,
                theme: 'grid',
                headStyles: { fillColor: '#333333' },
            });
            
            let finalY = (doc as any).lastAutoTable.finalY + 20;
            if (finalY > 250) {
                doc.addPage();
                finalY = 20;
            }

            // Signature
            doc.setFontSize(10);
            doc.text("Recibí conforme el equipamiento detallado en la presente ficha.", 14, finalY);
            
            finalY += 30;
            doc.line(14, finalY, 80, finalY);
            doc.text("Firma del Bombero", 16, finalY + 5);

            doc.line(130, finalY, 196, finalY);
            doc.text("Aclaración", 132, finalY + 5);

            doc.save(`ficha-${firefighter.lastName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({ title: "Error al generar PDF", description: "Hubo un problema al crear la ficha.", variant: "destructive" });
        } finally {
            setGeneratingFicha(false);
        }
    }


    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent < 0.05) return null; // Don't render label for tiny slices
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    const getStateBadge = (state: ClothingItem['state']) => {
        const stateClasses: Record<ClothingItem['state'], string> = {
            Nuevo: 'bg-sky-500',
            Bueno: 'bg-green-600',
            Regular: 'bg-yellow-500 text-black',
            Malo: 'bg-orange-600',
            Baja: 'bg-red-600',
        };
        return <Badge variant="default" className={cn(stateClasses[state], 'hover:' + stateClasses[state])}>{state}</Badge>;
    }


    if (loading) {
        return (
            <>
                <PageHeader title="Reportes de Ropería" description="Generando reportes..." />
                <Skeleton className="w-full h-[600px]" />
            </>
        )
    }

    return (
        <div className="space-y-8">
            <PageHeader title={isBomberoRole ? "Mi Ropería" : "Reportes de Ropería"} description="Filtre y visualice el estado y la asignación del inventario de ropa." />
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Filtros del Reporte</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label>Bombero Específico</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild disabled={isBomberoRole}>
                                <Button variant="outline" role="combobox" aria-expanded={openCombobox} className="w-full justify-between">
                                    {filterFirefighter !== 'all' ? `${allFirefighters.find(f => f.id === filterFirefighter)?.lastName}, ${allFirefighters.find(f => f.id === filterFirefighter)?.firstName}` : "Todos los bomberos"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar por nombre o legajo..." />
                                    <CommandList>
                                        <CommandEmpty>No se encontró el bombero.</CommandEmpty>
                                        <CommandItem value='all' onSelect={() => { setFilterFirefighter('all'); setOpenCombobox(false); }}>
                                            <Check className={cn("mr-2 h-4 w-4", filterFirefighter === 'all' ? "opacity-100" : "opacity-0")} />
                                            Todos los bomberos
                                        </CommandItem>
                                        {allFirefighters.filter(f => f.status === 'Active').map((firefighter) => (
                                            <CommandItem key={firefighter.id} value={`${firefighter.legajo} ${firefighter.lastName}, ${firefighter.firstName}`} onSelect={() => { setFilterFirefighter(firefighter.id); setOpenCombobox(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", filterFirefighter === firefighter.id ? "opacity-100" : "opacity-0")} />
                                                {`${firefighter.legajo} - ${firefighter.lastName}, ${firefighter.firstName}`}
                                            </CommandItem>
                                        ))}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Tipo de Prenda</Label>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los tipos</SelectItem>
                                {clothingItemTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Cuartel / Ubicación</Label>
                         <Select value={filterCuartel} onValueChange={setFilterCuartel}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los cuarteles</SelectItem>
                                {firehouses.map(fh => <SelectItem key={fh} value={fh}>{fh}</SelectItem>)}
                                <SelectItem value="En Depósito">En Depósito</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Estado de la Prenda</Label>
                        <Select value={filterState} onValueChange={setFilterState}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los estados</SelectItem>
                                {clothingStates.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {!isBomberoRole && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total de Prendas</CardTitle><Shirt className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{summaryStats.totalItems}</div></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Prendas en Depósito</CardTitle><Archive className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{summaryStats.itemsInDeposit}</div></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Prendas Asignadas</CardTitle><User className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{summaryStats.itemsGivenOut}</div></CardContent></Card>
                    <Card className="border-red-500/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Prendas de Baja</CardTitle><User className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{summaryStats.itemsDecommissioned}</div></CardContent></Card>
                </div>
            )}
            
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Distribución por Condición</CardTitle>
                    <CardDescription>Resumen de todas las prendas que coinciden con los filtros.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ChartContainer config={{}} className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                <Pie data={summaryStats.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} labelLine={false} label={renderCustomizedLabel}>
                                    {summaryStats.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Pie>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Detalle del Inventario</CardTitle>
                    <CardDescription>Mostrando {filteredItems.length} prendas con los filtros aplicados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Tipo</TableHead><TableHead>Talle</TableHead><TableHead>Asignado a</TableHead><TableHead>Condición</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono">{item.code}</TableCell>
                                        <TableCell className="font-medium">{item.type}</TableCell>
                                        <TableCell>{item.size}</TableCell>
                                        <TableCell>{item.firefighter ? `${item.firefighter.lastName}, ${item.firefighter.firstName}` : 'En Depósito'}</TableCell>
                                        <TableCell>{getStateBadge(item.state)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No se encontraron prendas con los filtros aplicados.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Exportar a PDF</CardTitle>
                    <CardDescription>Genere documentos a partir de los datos filtrados.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={generateGeneralPdf} disabled={generatingPdf}>
                        {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {generatingPdf ? "Generando..." : "Reporte General"}
                    </Button>
                    <Button onClick={generateFichaPdf} disabled={generatingFicha || filterFirefighter === 'all'}>
                        {generatingFicha ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
                        {generatingFicha ? "Generando..." : "Ficha de Bombero"}
                    </Button>
                </CardContent>
                 {filterFirefighter === 'all' && <CardFooter><p className="text-sm text-muted-foreground">Seleccione un bombero específico en los filtros para habilitar la generación de ficha.</p></CardFooter>}
            </Card>
        </div>
    );
}
