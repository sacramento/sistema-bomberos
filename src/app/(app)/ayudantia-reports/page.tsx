
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Download, ChevronsUpDown, Check, Loader2, ClipboardMinus, Gavel } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { es } from 'date-fns/locale';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { useState, useEffect, useMemo } from "react";
import { Firefighter, Leave, Sanction } from "@/lib/types";
import { getLeaves } from "@/services/leaves.service";
import { getSanctions } from "@/services/sanctions.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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
        fetchData();
    }, [toast]);

    const filteredData = useMemo(() => {
        const applyFilters = (items: (Leave | Sanction)[]) => {
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
    }, [allLeaves, allSanctions, allFirefighters, filterDate, filterHierarchy, filterStation, filterFirefighter]);

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

    return (
        <>
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

            <Tabs defaultValue="leaves" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6">
                    <TabsTrigger value="leaves"><ClipboardMinus className="mr-2 h-4 w-4"/>Licencias</TabsTrigger>
                    <TabsTrigger value="sanctions"><Gavel className="mr-2 h-4 w-4"/>Sanciones</TabsTrigger>
                </TabsList>
                <TabsContent value="leaves">{renderLeaveTable()}</TabsContent>
                <TabsContent value="sanctions">{renderSanctionTable()}</TabsContent>
            </Tabs>
        </>
    );
}
