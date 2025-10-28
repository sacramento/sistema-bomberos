
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Download, ChevronsUpDown, Check, Loader2, ClipboardMinus, Gavel, UserX, UserCheck } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { es } from 'date-fns/locale';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { useState, useEffect, useMemo } from "react";
import { Firefighter, Leave, Sanction, LeaveType } from "@/lib/types";
import { getLeaves } from "@/services/leaves.service";
import { getSanctions } from "@/services/sanctions.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList, CommandGroup } from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Switch } from "@/components/ui/switch";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts";


const hierarchyOptions = [
    { value: 'aspirantes', label: 'Aspirantes' },
    { value: 'bomberos', label: 'Bomberos' },
    { value: 'suboficiales_oficiales', label: 'Suboficiales y Oficiales' }
];

const stationOptions = [
    { value: 'Cuartel 1', label: 'Cuartel 1' },
    { value: 'Cuartel 2', label: 'Cuartel 2' },
    { value: 'Cuartel 3', label: 'Cuartel 3' },
];

const LEAVE_CHART_COLORS: Record<LeaveType, string> = {
    Ordinaria: "#3B82F6",       // blue-500
    Extraordinaria: "#8B5CF6", // violet-500
    Enfermedad: "#FBBF24",     // yellow-400
    Estudio: "#10B981",        // emerald-500
    Maternidad: "#EC4899",     // pink-500
};


const MultiSelectFilter = ({
    title,
    options,
    selected,
    onSelectedChange
}: {
    title: string;
    options: { value: string; label: string }[];
    selected: string[];
    onSelectedChange: (selected: string[]) => void;
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
    const selectedLabels = selected.map(s => options.find(o => o.value === s)?.label).filter(Boolean);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto">
                    <div className="flex gap-1 flex-wrap">
                         {selected.length > 0 ? (
                            selectedLabels.map(label => <Badge variant="secondary" key={label}>{label}</Badge>)
                        ) : (
                            `Seleccionar ${title.toLowerCase()}...`
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Buscar ${title.toLowerCase()}...`} />
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

export default function AyudantiaReportsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    // Raw Data
    const [allLeaves, setAllLeaves] = useState<Leave[]>([]);
    const [allSanctions, setAllSanctions] = useState<Sanction[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);

    // Filters
    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterHierarchy, setFilterHierarchy] = useState<string[]>([]);
    const [filterStation, setFilterStation] = useState<string[]>([]);
    const [filterFirefighter, setFilterFirefighter] = useState('all');
    const [openCombobox, setOpenCombobox] = useState(false);
    const [filtersApplied, setFiltersApplied] = useState(false);
    
    // PDF Export Options
    const [includeLeaves, setIncludeLeaves] = useState(true);
    const [includeSanctions, setIncludeSanctions] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [leavesData, sanctionsData, firefightersData] = await Promise.all([
                    getLeaves(),
                    getSanctions(),
                    getFirefighters()
                ]);
                setAllLeaves(leavesData);
                setAllSanctions(sanctionsData);
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
             }
        }

        fetchData();
        fetchLogo();
    }, [toast]);
    
    useEffect(() => {
        // Track if any filter is active
        const isFilterActive = filterDate !== undefined || filterHierarchy.length > 0 || filterStation.length > 0 || filterFirefighter !== 'all';
        setFiltersApplied(isFilterActive);
    }, [filterDate, filterHierarchy, filterStation, filterFirefighter]);

    const summaryStats = useMemo(() => {
        const today = new Date();
        const activeLeavesToday = allLeaves.filter(l => isWithinInterval(today, { start: parseISO(l.startDate), end: parseISO(l.endDate) })).length;
        const activeSanctionsToday = allSanctions.filter(s => isWithinInterval(today, { start: parseISO(s.startDate), end: parseISO(s.endDate) })).length;
        
        const leavesByType = allLeaves.reduce((acc, leave) => {
            acc[leave.type] = (acc[leave.type] || 0) + 1;
            return acc;
        }, {} as Record<LeaveType, number>);

        const pieData = Object.entries(leavesByType).map(([name, value]) => ({
            name,
            value,
            fill: LEAVE_CHART_COLORS[name as LeaveType] || '#ccc'
        })).filter(item => item.value > 0);

        return {
            totalLeaves: allLeaves.length,
            totalSanctions: allSanctions.length,
            activeLeavesToday,
            activeSanctionsToday,
            pieData
        }
    }, [allLeaves, allSanctions]);

    const filteredData = useMemo(() => {
        if (!filtersApplied) return { leaves: [], sanctions: [] };

        const applyFilters = <T extends Leave | Sanction>(items: T[]): T[] => {
            return items.filter(item => {
                const firefighter = allFirefighters.find(f => f.id === item.firefighterId);
                if (!firefighter || firefighter.status !== 'Active') return false;

                if (filterFirefighter !== 'all' && item.firefighterId !== filterFirefighter) return false;
                if (filterStation.length > 0 && !filterStation.includes(firefighter.firehouse)) return false;

                if (filterHierarchy.length > 0) {
                    const suboficialRanks = ['CABO', 'CABO PRIMERO', 'SARGENTO', 'SARGENTO PRIMERO', 'SUBOFICIAL PRINCIPAL', 'SUBOFICIAL MAYOR'];
                    const oficialRanks = ['OFICIAL AYUDANTE', 'OFICIAL INSPECTOR', 'OFICIAL PRINCIPAL', 'SUBCOMANDANTE', 'COMANDANTE', 'COMANDANTE MAYOR', 'COMANDANTE GENERAL'];
                    const hierarchyMatch = filterHierarchy.some(h => {
                        if (h === 'bomberos' && firefighter.rank === 'BOMBERO') return true;
                        if (h === 'aspirantes' && firefighter.rank === 'ASPIRANTE') return true;
                        if (h === 'suboficiales_oficiales' && [...suboficialRanks, ...oficialRanks].includes(firefighter.rank)) return true;
                        return false;
                    });
                    if (!hierarchyMatch) return false;
                }

                if (filterDate?.from) {
                    const itemStartDate = startOfDay(parseISO(item.startDate));
                    const itemEndDate = endOfDay(parseISO(item.endDate));
                    const filterStartDate = startOfDay(filterDate.from);
                    const filterEndDate = endOfDay(filterDate.to ?? filterDate.from);
                    if (itemStartDate > filterEndDate || itemEndDate < filterStartDate) return false;
                }
                return true;
            });
        };

        return {
            leaves: applyFilters(allLeaves) as Leave[],
            sanctions: applyFilters(allSanctions) as Sanction[],
        };
    }, [filtersApplied, allLeaves, allSanctions, allFirefighters, filterDate, filterHierarchy, filterStation, filterFirefighter]);

    const generatePdf = async () => {
        if (!includeLeaves && !includeSanctions) {
            toast({ title: "Acción requerida", description: "Debe seleccionar al menos un tipo de reporte para exportar.", variant: "destructive" });
            return;
        }
        if (!logoDataUrl) {
            toast({ title: "Espere un momento", description: "El logo para el PDF aún se está cargando.", variant: "destructive" }); return;
        }

        setGeneratingPdf(true);
        const doc = new jsPDF();
        let currentY = 20; // Initial Y position
        const pageHeight = doc.internal.pageSize.height;
        
        try {
            const addHeader = (title: string) => {
                doc.setFillColor(220, 53, 69);
                doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
                doc.setFontSize(22);
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.text(title, 14, 22);
                doc.addImage(logoDataUrl, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');
                currentY = 45;
            };

            const addFilterInfo = () => {
                const dateText = filterDate?.from ? `Período: ${format(filterDate.from, "P", { locale: es })} - ${format(filterDate.to ?? filterDate.from, "P", { locale: es })}` : "Período: Todos los registros";
                doc.setFontSize(11);
                doc.setTextColor(108, 117, 125);
                doc.setFont('helvetica', 'normal');
                doc.text(dateText, 14, currentY);
                currentY += 10;
            };

            let title = 'Reporte de Ayudantía';
            if (includeLeaves && !includeSanctions) title = 'Reporte de Licencias';
            if (!includeLeaves && includeSanctions) title = 'Reporte de Sanciones';
            addHeader(title);
            addFilterInfo();
            
            const addTable = (sectionTitle: string, head: any[], body: any[]) => {
                if (body.length > 0) {
                     if (currentY > 20) doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(0,0,0); doc.text(sectionTitle, 14, currentY); currentY += 8;
                    (doc as any).autoTable({
                        startY: currentY,
                        head: head,
                        body: body,
                        theme: 'striped',
                        headStyles: { fillColor: '#333333' },
                        didDrawPage: (data: any) => { currentY = data.cursor.y + 15; }
                    });
                    currentY = (doc as any).lastAutoTable.finalY + 15;
                }
            };
            
            if (includeLeaves) {
                addTable('Licencias', 
                    [['Bombero', 'Tipo', 'Desde', 'Hasta']], 
                    filteredData.leaves.map(item => [item.firefighterName, item.type, format(parseISO(item.startDate), "P", { locale: es }), format(parseISO(item.endDate), "P", { locale: es })])
                );
            }
            
            if (includeSanctions) {
                if (includeLeaves && filteredData.sanctions.length > 0 && currentY > pageHeight - 50) { doc.addPage(); addHeader(title); addFilterInfo(); }
                addTable('Sanciones', 
                    [['Bombero', 'Motivo', 'Desde', 'Hasta']], 
                    filteredData.sanctions.map(item => [item.firefighterName, item.reason, format(parseISO(item.startDate), "P", { locale: es }), format(parseISO(item.endDate), "P", { locale: es })])
                );
            }

            doc.save(`reporte-ayudantia-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({ title: "Error al generar PDF", description: "Hubo un problema al crear el archivo PDF.", variant: "destructive" });
        } finally {
            setGeneratingPdf(false);
        }
    };

    if (loading) {
        return (
            <>
                <PageHeader title="Reportes de Ayudantía" description="Generando reportes..." />
                <Skeleton className="w-full h-[600px]" />
            </>
        )
    }

    const renderLeaveTable = () => (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Resultados de Licencias</CardTitle>
                <CardDescription>Se encontraron {filteredData.leaves.length} licencias con los filtros aplicados.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Bombero</TableHead><TableHead>Tipo</TableHead><TableHead>Desde</TableHead><TableHead>Hasta</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filteredData.leaves.length > 0 ? (
                            filteredData.leaves.map((leave) => (
                                <TableRow key={leave.id}><TableCell className="font-medium">{leave.firefighterName}</TableCell><TableCell>{leave.type}</TableCell><TableCell>{format(parseISO(leave.startDate), "P", { locale: es })}</TableCell><TableCell>{format(parseISO(leave.endDate), "P", { locale: es })}</TableCell></TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No se encontraron licencias.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    const renderSanctionTable = () => (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Resultados de Sanciones</CardTitle>
                <CardDescription>Se encontraron {filteredData.sanctions.length} sanciones con los filtros aplicados.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Bombero</TableHead><TableHead>Motivo</TableHead><TableHead>Desde</TableHead><TableHead>Hasta</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filteredData.sanctions.length > 0 ? (
                            filteredData.sanctions.map((sanction) => (
                                <TableRow key={sanction.id}><TableCell className="font-medium">{sanction.firefighterName}</TableCell><TableCell>{sanction.reason}</TableCell><TableCell>{format(parseISO(sanction.startDate), "P", { locale: es })}</TableCell><TableCell>{format(parseISO(sanction.endDate), "P", { locale: es })}</TableCell></TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No se encontraron sanciones.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
    
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

    const renderSummary = () => (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Licencias Activas Hoy</CardTitle><UserX className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{summaryStats.activeLeavesToday}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Sanciones Activas Hoy</CardTitle><Gavel className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{summaryStats.activeSanctionsToday}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Licencias</CardTitle><ClipboardMinus className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{summaryStats.totalLeaves}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Sanciones</CardTitle><Gavel className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{summaryStats.totalSanctions}</div></CardContent></Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Distribución de Tipos de Licencia</CardTitle>
                    <CardDescription>Resumen de todas las licencias registradas en el sistema.</CardDescription>
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
        </div>
    );

    return (
        <div className="space-y-8">
            <PageHeader title="Reportes de Ayudantía" description="Filtre y visualice los registros de licencias y sanciones del personal." />
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="font-headline">Filtros del Reporte</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label>Rango de Fechas</Label>
                        <Popover>
                            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !filterDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filterDate?.from ? (filterDate.to ? (<>{format(filterDate.from, "LLL dd, y", { locale: es })} - {format(filterDate.to, "LLL dd, y", { locale: es })}</>) : (format(filterDate.from, "LLL dd, y", { locale: es }))) : (<span>Seleccionar rango</span>)}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={filterDate?.from} selected={filterDate} onSelect={setFilterDate} numberOfMonths={2} locale={es} /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Integrante Específico</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={openCombobox} className="w-full justify-between">{filterFirefighter !== 'all' ? `${allFirefighters.find(f => f.id === filterFirefighter)?.firstName} ${allFirefighters.find(f => f.id === filterFirefighter)?.lastName}` : "Todos los integrantes"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar integrante..." /><CommandList>
                                    <CommandEmpty>No se encontró el integrante.</CommandEmpty>
                                    <CommandItem value='all' onSelect={() => { setFilterFirefighter('all'); setOpenCombobox(false); }}><Check className={cn("mr-2 h-4 w-4", filterFirefighter === 'all' ? "opacity-100" : "opacity-0")} />Todos los integrantes</CommandItem>
                                    {allFirefighters.filter(f => f.status === 'Active').map((firefighter) => (<CommandItem key={firefighter.id} value={`${firefighter.firstName} ${firefighter.lastName}`} onSelect={() => { setFilterFirefighter(firefighter.id); setOpenCombobox(false);}}><Check className={cn("mr-2 h-4 w-4", filterFirefighter === firefighter.id ? "opacity-100" : "opacity-0")} />{`${firefighter.legajo} - ${firefighter.firstName} ${firefighter.lastName}`}</CommandItem>))}
                                </CommandList></Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Jerarquía</Label>
                        <MultiSelectFilter title="Jerarquías" options={hierarchyOptions} selected={filterHierarchy} onSelectedChange={setFilterHierarchy} />
                    </div>
                    <div className="space-y-2">
                        <Label>Cuartel</Label>
                        <MultiSelectFilter title="Cuarteles" options={stationOptions} selected={filterStation} onSelectedChange={setFilterStation} />
                    </div>
                </CardContent>
            </Card>

            {filtersApplied ? (
                 <Tabs defaultValue="leaves" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6">
                        <TabsTrigger value="leaves"><ClipboardMinus className="mr-2 h-4 w-4"/>Licencias</TabsTrigger>
                        <TabsTrigger value="sanctions"><Gavel className="mr-2 h-4 w-4"/>Sanciones</TabsTrigger>
                    </TabsList>
                    <TabsContent value="leaves">{renderLeaveTable()}</TabsContent>
                    <TabsContent value="sanctions">{renderSanctionTable()}</TabsContent>
                </Tabs>
            ) : (
                renderSummary()
            )}
            
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Exportar Reporte</CardTitle>
                    <CardDescription>Seleccione qué incluir y genere un archivo PDF con los resultados filtrados.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                        <div className="flex items-center space-x-2">
                            <Switch id="include-leaves" checked={includeLeaves} onCheckedChange={setIncludeLeaves} />
                            <Label htmlFor="include-leaves">Incluir Licencias</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <Switch id="include-sanctions" checked={includeSanctions} onCheckedChange={setIncludeSanctions}/>
                            <Label htmlFor="include-sanctions">Incluir Sanciones</Label>
                        </div>
                    </div>
                    <Button onClick={generatePdf} disabled={generatingPdf || !filtersApplied}>
                        {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {generatingPdf ? "Generando..." : "Generar PDF"}
                    </Button>
                     {!filtersApplied && <p className="text-sm text-muted-foreground">Aplique al menos un filtro para poder generar un reporte.</p>}
                </CardContent>
            </Card>
        </div>
    );
}
