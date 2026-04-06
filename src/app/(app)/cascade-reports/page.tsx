
'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { getCascadeCharges, getCascadeSystemCharges } from '@/services/cascade.service';
import { getMaterials } from '@/services/materials.service';
import { getUsers, User } from '@/services/users.service';
import { CascadeCharge, CascadeSystemCharge, Material } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Download, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { APP_CONFIG } from '@/lib/config';


const PIE_CHART_COLORS: Record<string, string> = {
    'Cuartel 1': "#facc15", // yellow-400
    'Cuartel 2': "#3b82f6", // blue-500
    'Cuartel 3': "#22c55e", // green-500
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (!percent || percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const cascadeTubes = ['Tubo 1', 'Tubo 2', 'Tubo 3', 'Tubo 4'] as const;

const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return 'N/A';
    const minutes = differenceInMinutes(parseISO(end), parseISO(start));
    if (isNaN(minutes) || minutes < 0) return 'N/A';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}min`;
}

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


export default function CascadeReportsPage() {
    const { toast } = useToast();
    
    const [loading, setLoading] = useState(true);
    const [allCharges, setAllCharges] = useState<CascadeCharge[]>([]);
    const [allMaterials, setAllMaterials] = useState<Material[]>([]);
    const [systemCharges, setSystemCharges] = useState<CascadeSystemCharge[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    const [filterDate, setFilterDate] = useState<DateRange | undefined>();
    const [filterCuartel, setFilterCuartel] = useState('all');
    const [filterUser, setFilterUser] = useState('all');
    const [filterTubes, setFilterTubes] = useState<string[]>([]);
    const [userComboboxOpen, setUserComboboxOpen] = useState(false);
    
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [chargesData, materialsData, systemChargesData, usersData] = await Promise.all([
                    getCascadeCharges(),
                    getMaterials(),
                    getCascadeSystemCharges(),
                    getUsers(),
                ]);
                setAllCharges(chargesData);
                setAllMaterials(materialsData.filter(m => m.itemTypeId === '01.5.3'));
                setSystemCharges(systemChargesData);
                setAllUsers(usersData);
            } catch (error) {
                toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
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
                 console.error("Failed to load logo for PDF", error);
             }
        }
        fetchData();
        fetchLogo();
    }, [toast]);
    
    const formatCascadeDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        try {
            return format(parseISO(dateString), 'Pp', { locale: es });
        } catch (e) {
            return 'Fecha inválida';
        }
    };
    
    const filteredCharges = useMemo(() => {
        return allCharges.filter(charge => {
            if (filterCuartel !== 'all' && charge.cuartel !== filterCuartel) return false;
            if (filterUser !== 'all' && charge.actorId !== filterUser) return false;
            if (filterDate?.from && charge.chargeTimestamp) {
                const chargeDate = parseISO(charge.chargeTimestamp);
                const toDate = filterDate.to ?? filterDate.from;
                if (!isWithinInterval(chargeDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return false;
            }
            return true;
        });
    }, [allCharges, filterDate, filterCuartel, filterUser]);
    
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
        })).filter(item => {
            if (filterCuartel !== 'all' && item.cuartel !== filterCuartel) return false;
            return item.chargeCount > 0;
        }).sort((a,b) => b.chargeCount - a.chargeCount);
        return { tableData, pieData, totalCharges: filteredCharges.length };
    }, [filteredCharges, allMaterials, filterCuartel]);

    const filteredSystemCharges = useMemo(() => {
        return systemCharges.filter(charge => {
            if (filterUser !== 'all' && charge.actorId !== filterUser) return false;
            if (filterTubes.length > 0 && !filterTubes.some(tube => charge.tubes.includes(tube as any))) return false;
            if (filterDate?.from && charge.startTime) {
                const chargeStartDate = parseISO(charge.startTime);
                const toDate = filterDate.to ?? filterDate.from;
                if (!isWithinInterval(chargeStartDate, { start: startOfDay(filterDate.from), end: endOfDay(toDate) })) return false;
            }
            return true;
        });
    }, [systemCharges, filterDate, filterUser, filterTubes]);

    const addPdfHeader = (doc: jsPDF, title: string) => {
        doc.setFillColor(220, 53, 69);
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
        doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
        doc.text(`${title} - ${APP_CONFIG.name}`, 14, 22);
        if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25);
    };

    const generatePdf = async () => { 
        if (!logoDataUrl) return;
        setGeneratingPdf(true);
        const doc = new jsPDF();
        try {
            addPdfHeader(doc, "Reporte de Carga de Tubos ERA");
            let currentY = 45;
            if (reportData.tableData.length > 0) {
                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Tubo (Código)', 'Cuartel', 'Nº de Cargas']],
                    body: reportData.tableData.map(item => [item.code, item.cuartel, item.chargeCount]),
                    theme: 'striped', headStyles: { fillColor: '#333' },
                });
            } else {
                 doc.setFontSize(12); doc.setTextColor(0); doc.text("Sin registros para los filtros seleccionados.", 14, currentY);
            }
            doc.save(`reporte-tubos-era-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingPdf(false); }
    };
    
    const generateSystemPdf = async () => {
        if (!logoDataUrl) return;
        setGeneratingSystemPdf(true);
        const doc = new jsPDF();
        try {
            addPdfHeader(doc, "Reporte de Sistema de Cascada");
            let currentY = 45;
            if (filteredSystemCharges.length > 0) {
                 (doc as any).autoTable({
                    startY: currentY,
                    head: [['Tubos', 'Inicio', 'Fin', 'Duración', 'Operador']],
                    body: filteredSystemCharges.map(item => [item.tubes.join(', '), formatCascadeDate(item.startTime), formatCascadeDate(item.endTime), formatDuration(item.startTime, item.endTime), item.actorName]),
                    theme: 'striped', headStyles: { fillColor: '#333' },
                });
            } else {
                 doc.setFontSize(12); doc.setTextColor(0); doc.text("Sin registros para los filtros seleccionados.", 14, currentY);
            }
            doc.save(`reporte-cascada-sistema-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingSystemPdf(false); }
    };

    const userOptions = useMemo(() => {
        return [...allUsers].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).map(u => ({ value: u.id, label: `${u.id} - ${u.name}` }));
    }, [allUsers]);

    return (
        <div className="space-y-8">
            <PageHeader title="Reportes de Cascada" description="Estadísticas de uso y recarga de equipos de respiración." />
            <Tabs defaultValue="tubosERA" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-md:max-w-md mx-auto"><TabsTrigger value="tubosERA">Tubos ERA</TabsTrigger><TabsTrigger value="cascada">Sistema Cascada</TabsTrigger></TabsList>
                <TabsContent value="tubosERA" className="mt-6 space-y-8">
                    <Card><CardHeader><CardTitle className="font-headline">Filtros</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             <div className="space-y-2"><Label>Período</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !filterDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filterDate?.from ? format(filterDate.from, "P", {locale: es}) : "Todos"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={filterDate?.from} selected={filterDate} onSelect={setFilterDate} numberOfMonths={2} locale={es} /></PopoverContent></Popover></div>
                            <div className="space-y-2"><Label>Cuartel</Label><Select value={filterCuartel} onValueChange={setFilterCuartel}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{['Cuartel 1', 'Cuartel 2', 'Cuartel 3'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-2"><Label>Usuario</Label><Popover open={userComboboxOpen} onOpenChange={setUserComboboxOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between">{filterUser !== 'all' ? userOptions.find(u => u.value === filterUser)?.label : "Todos"}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty><CommandItem onSelect={() => { setFilterUser('all'); setUserComboboxOpen(false); }}>Todos</CommandItem>{userOptions.map(u => (<CommandItem key={u.value} value={u.label} onSelect={() => { setFilterUser(u.value); setUserComboboxOpen(false); }}>{u.label}</CommandItem>))}</CommandList></Command></PopoverContent></Popover></div>
                        </CardContent>
                    </Card>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <Card className="lg:col-span-1"><CardHeader><CardTitle className="font-headline">Cargas por Cuartel</CardTitle></CardHeader><CardContent><ChartContainer config={{}} className="h-64"><ResponsiveContainer><PieChart><Pie data={reportData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} labelLine={false} label={renderCustomizedLabel}>{reportData.pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></ChartContainer></CardContent></Card>
                        <Card className="lg:col-span-2"><CardHeader><CardTitle className="font-headline">Detalle por Tubo</CardTitle></CardHeader><CardContent className="max-h-[400px] overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Cuartel</TableHead><TableHead>Cargas</TableHead></TableRow></TableHeader><TableBody>{reportData.tableData.map((item) => (<TableRow key={item.code}><TableCell className="font-mono font-medium">{item.code}</TableCell><TableCell>{item.cuartel}</TableCell><TableCell className="font-bold">{item.chargeCount}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
                    </div>
                    <Card><CardHeader><CardTitle className="font-headline">Exportar Reporte</CardTitle></CardHeader><CardContent><Button onClick={generatePdf} disabled={generatingPdf}>{generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Generar PDF</Button></CardContent></Card>
                </TabsContent>
                <TabsContent value="cascada" className="mt-6 space-y-8">
                     <Card><CardHeader><CardTitle className="font-headline">Filtros de Sistema</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="space-y-2"><Label>Período</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className="w-full justify-start text-xs h-10"><CalendarIcon className="mr-2 h-4 w-4" />{filterDate?.from ? format(filterDate.from, "P", {locale: es}) : "Todos"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="range" selected={filterDate} onSelect={setFilterDate} locale={es} /></PopoverContent></Popover></div><div className="space-y-2"><Label>Tubos</Label><MultiSelectFilter title="Tubos" options={cascadeTubes.map(t => ({ value: t, label: t }))} selected={filterTubes} onSelectedChange={setFilterTubes} /></div><div className="space-y-2"><Label>Usuario</Label><Popover open={userComboboxOpen} onOpenChange={setUserComboboxOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between h-10 text-xs">{filterUser !== 'all' ? userOptions.find(u => u.value === filterUser)?.label : "Todos"}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="p-0"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty><CommandItem onSelect={() => {setFilterUser('all'); setUserComboboxOpen(false);}}>Todos</CommandItem>{userOptions.map(u => (<CommandItem key={u.value} value={u.label} onSelect={() => {setFilterUser(u.value); setUserComboboxOpen(false);}}>{u.label}</CommandItem>))}</CommandList></Command></PopoverContent></Popover></div></CardContent></Card>
                     <Card><CardHeader><CardTitle className="font-headline">Historial de Sistema</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Tubos</TableHead><TableHead>Inicio</TableHead><TableHead>Fin</TableHead><TableHead>Operador</TableHead></TableRow></TableHeader><TableBody>{filteredSystemCharges.length > 0 ? filteredSystemCharges.map(charge => (<TableRow key={charge.id}><TableCell><div className="flex gap-1 flex-wrap">{charge.tubes.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}</div></TableCell><TableCell className="text-xs">{formatCascadeDate(charge.startTime)}</TableCell><TableCell className="text-xs">{formatCascadeDate(charge.endTime)}</TableCell><TableCell className="text-xs">{charge.actorName}</TableCell></TableRow>)) : (<TableRow><TableCell colSpan={4} className="h-24 text-center">Sin resultados.</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
                     <Card><CardHeader><CardTitle className="font-headline">Exportar Sistema</CardTitle></CardHeader><CardContent><Button onClick={generateSystemPdf} disabled={generatingSystemPdf || filteredSystemCharges.length === 0}>{generatingSystemPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Generar PDF</Button></CardContent></Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
