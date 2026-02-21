'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, Edit, Download, Loader2, Package, Shield, HeartPulse, Truck, Search, ChevronsUpDown, Check, Ruler, QrCode, Trash } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Material, Specialization, Vehicle, Firefighter } from "@/lib/types";
import { getMaterials, deleteMaterial, deleteAllMaterials } from "@/services/materials.service";
import { getVehicles } from "@/services/vehicles.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import EditMaterialDialog from "../materials/_components/edit-material-dialog";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import QrScannerDialog from "../materials/_components/qr-scanner-dialog";

const materialTypes: Material['tipo'][] = [
    'BOMBEO', 'COMUNICACION', 'DOCUMENTACION', 'ESTABILIZACION', 'H. CORTE', 
    'H. ELECTRICA', 'H. GOLPE', 'H. HIDRAULICA', 'H. NEUMATICA', 'HERRAMIENTA', 
    'ILUMINACION', 'INMOVILIZACION', 'LANZA', 'LOGISTICA', 'MANGA', 'MEDICION', 
    'MEDICO', 'PROTECCION', 'RESPIRACION', 'TRANSPORTE'
].sort() as Material['tipo'][];

const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'GENERAL'];
const firehouses: Material['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

const STATUS_COLORS: Record<string, string> = {
    'En Servicio': "#22C55E",
    'Fuera de Servicio': "#EF4444",
};

const CONDITION_COLORS: Record<string, string> = {
    'Bueno': "#22C55E",
    'Regular': "#FBBF24",
    'Malo': "#F97316",
};

const MultiSelectFilter = ({
    title,
    options,
    selected,
    onSelectedChange,
    searchPlaceholder,
    renderBadge
}: {
    title: string;
    options: { value: string; label: string }[];
    selected: string[];
    onSelectedChange: (selected: string[]) => void;
    searchPlaceholder?: string;
    renderBadge?: (value: string) => React.ReactNode;
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
    
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-10 text-xs">
                    <div className="flex gap-1 flex-wrap">
                         {selected.length > 0 ? (
                            selected.map(value => renderBadge ? renderBadge(value) : <Badge variant="secondary" key={value} className="text-[10px]">{options.find(o => o.value === value)?.label || value}</Badge>)
                        ) : (
                            `Seleccionar ${title.toLowerCase()}...`
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder || `Buscar ${title.toLowerCase()}...`} />
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

const KpiCard = ({ title, value, icon: Icon, description, colorClass }: { title: string, value: string | number, icon: any, description?: string, colorClass?: string }) => (
    <Card className={cn("shadow-sm", colorClass)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </CardContent>
    </Card>
);

export default function MaterialsReportPage() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTypes, setFilterTypes] = useState<string[]>([]);
    const [filterFirehouses, setFilterFirehouses] = useState<string[]>([]);
    const [filterSpecializations, setFilterSpecializations] = useState<string[]>([]);
    const [filterVehicles, setFilterVehicles] = useState<string[]>([]);
    const [filterDiameters, setFilterDiameters] = useState<string[]>([]);
    const [filterStates, setFilterStates] = useState<string[]>([]);
    const [filterConditions, setFilterConditions] = useState<string[]>([]);
    
    // PDF Config
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [includeKPIs, setIncludeKPIs] = useState(true);
    const [includeInventoryDetails, setIncludeInventoryDetails] = useState(true);
    const [includeCharts, setIncludeCharts] = useState(true);

    // Deletion
    const [deleteTarget, setDeleteTarget] = useState('all');
    const [confirmationText, setConfirmationText] = useState('');

    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);
    const canManageGlobally = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

    const handleDataChange = async () => {
        setLoading(true);
        try {
            const [materialsData, vehiclesData] = await Promise.all([
                getMaterials(),
                getVehicles(),
            ]);
            setMaterials(materialsData);
            setVehicles(vehiclesData);
        } catch (error) {
             toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        handleDataChange();
        const fetchLogo = async () => {
             try {
                const response = await fetch('https://i.ibb.co/yF0SYDNF/logo.png');
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => { setLogoDataUrl(reader.result as string); };
                reader.readAsDataURL(blob);
             } catch (error) {
                 console.error("Failed to load logo", error);
             }
        }
        fetchLogo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredMaterials = useMemo(() => {
        return materials.filter(material => {
            // Text Search
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const matchesSearch = material.nombre.toLowerCase().includes(searchLower) || 
                                     material.codigo.toLowerCase().includes(searchLower) ||
                                     material.caracteristicas?.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Multi-select Filters
            if (filterTypes.length > 0 && !filterTypes.includes(material.tipo)) return false;
            if (filterFirehouses.length > 0 && !filterFirehouses.includes(material.cuartel)) return false;
            if (filterSpecializations.length > 0 && !filterSpecializations.includes(material.especialidad)) return false;
            if (filterVehicles.length > 0 && (!material.ubicacion?.vehiculoId || !filterVehicles.includes(material.ubicacion.vehiculoId))) return false;
            if (filterDiameters.length > 0 && (!material.medida || !filterDiameters.includes(material.medida))) return false;
            if (filterStates.length > 0 && !filterStates.includes(material.estado)) return false;
            if (filterConditions.length > 0 && !filterConditions.includes(material.condicion)) return false;
            
            return true;
        });
    }, [materials, searchTerm, filterTypes, filterFirehouses, filterSpecializations, filterVehicles, filterDiameters, filterStates, filterConditions]);

    const kpis = useMemo(() => {
        const total = filteredMaterials.length;
        if (total === 0) return { total: 0, inService: 0, servicePercent: '0%', goodCondition: 0, goodConditionPercent: '0%' };
        
        const inService = filteredMaterials.filter(m => m.estado === 'En Servicio').length;
        const goodCondition = filteredMaterials.filter(m => m.condicion === 'Bueno').length;
        
        return {
            total,
            inService,
            servicePercent: `${((inService / total) * 100).toFixed(0)}%`,
            goodCondition,
            goodConditionPercent: `${((goodCondition / total) * 100).toFixed(0)}%`
        };
    }, [filteredMaterials]);

    const chartData = useMemo(() => {
        const statusCounts = filteredMaterials.reduce((acc, m) => {
            acc[m.estado] = (acc[m.estado] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const conditionCounts = filteredMaterials.reduce((acc, m) => {
            acc[m.condicion] = (acc[m.condicion] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            status: Object.entries(statusCounts).map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] || '#ccc' })),
            condition: Object.entries(conditionCounts).map(([name, value]) => ({ name, value, fill: CONDITION_COLORS[name] || '#ccc' })),
        };
    }, [filteredMaterials]);

    const availableDiameters = useMemo(() => {
        const diameters = new Set<string>();
        materials.forEach(m => { if(m.medida) diameters.add(m.medida); });
        return Array.from(diameters).sort();
    }, [materials]);

    const handleQrScan = (code: string) => {
        setSearchTerm(code);
        toast({ title: "Material Identificado", description: `Buscando código: ${code}` });
    };

    const handleBulkDelete = async () => {
        if (confirmationText !== 'ELIMINAR') {
            toast({ variant: "destructive", title: "Confirmación incorrecta", description: "Escriba ELIMINAR para proceder." });
            return;
        }
        const target = deleteTarget === 'all' ? undefined : deleteTarget;
        try {
            const count = await deleteAllMaterials(user, target);
            toast({ title: "¡Éxito!", description: `Se eliminaron ${count} materiales.` });
            setConfirmationText('');
            handleDataChange();
        } catch (error: any) {
             toast({ variant: "destructive", title: "Error", description: error.message });
        }
    }

    const generatePdf = async () => {
        if (!logoDataUrl) { toast({ title: "Espere un momento", description: "Cargando componentes del PDF..." }); return; }
        setGeneratingPdf(true);
        const doc = new jsPDF();
        try {
            doc.setFillColor(220, 53, 69);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text("Reporte Estratégico de Inventario", 14, 22);
            doc.addImage(logoDataUrl, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');

            let currentY = 45;
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generado: ${format(new Date(), 'Pp', {locale: es})}`, 14, currentY);
            currentY += 10;

            if (includeKPIs) {
                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Métrica', 'Valor']],
                    body: [
                        ['Total de ítems filtrados', kpis.total.toString()],
                        ['Operatividad (En Servicio)', kpis.servicePercent],
                        ['Salud Física (Bueno)', kpis.goodConditionPercent],
                    ],
                    theme: 'grid',
                    headStyles: { fillColor: '#6c757d' },
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
            }

            if (includeInventoryDetails && filteredMaterials.length > 0) {
                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Código', 'Nombre', 'Tipo', 'Ubicación', 'Estado', 'Condición']],
                    body: filteredMaterials.map(m => [
                        m.codigo, m.nombre, m.tipo,
                        m.ubicacion.type === 'deposito' ? `Dep. ${m.cuartel}` : `Mov. ${m.vehiculo?.numeroMovil}`,
                        m.estado, m.condicion
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: '#333' },
                    styles: { fontSize: 8 }
                });
            }
            doc.save(`reporte-inventario-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo generar el PDF." });
        } finally {
            setGeneratingPdf(false);
        }
    };

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent < 0.05) return null;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-bold">{`${(percent * 100).toFixed(0)}%`}</text>;
    };

    return (
        <div className="space-y-8 pb-20">
            <PageHeader title="Consola de Reportes de Materiales" description="Herramienta avanzada de búsqueda, análisis y gestión de inventario."/>
            
            {/* Search and Quick Action */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="font-headline text-lg">Búsqueda Rápida</CardTitle></CardHeader>
                    <CardContent className="flex gap-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar por código, nombre o características..." className="pl-9 h-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <QrScannerDialog onScan={handleQrScan}>
                            <Button size="lg" variant="outline" className="h-12"><QrCode className="mr-2" />Escanear</Button>
                        </QrScannerDialog>
                    </CardContent>
                </Card>
                <KpiCard title="Operatividad" value={kpis.servicePercent} icon={Shield} description={`${kpis.inService} de ${kpis.total} equipos`} colorClass={parseFloat(kpis.servicePercent) < 80 ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'} />
            </div>

            {/* Visual Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="text-sm font-semibold">Estado Operativo</CardTitle></CardHeader>
                    <CardContent className="h-48">
                        <ChartContainer config={{}} className="h-full w-full">
                            <ResponsiveContainer><PieChart><Pie data={chartData.status} dataKey="value" nameKey="name" cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={60}>{chartData.status.map((e, i) => (<Cell key={i} fill={e.fill} />))}</Pie><Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} /></PieChart></ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm font-semibold">Condición Física</CardTitle></CardHeader>
                    <CardContent className="h-48">
                        <ChartContainer config={{}} className="h-full w-full">
                            <ResponsiveContainer><PieChart><Pie data={chartData.condition} dataKey="value" nameKey="name" cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={60}>{chartData.condition.map((e, i) => (<Cell key={i} fill={e.fill} />))}</Pie><Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} /></PieChart></ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader><CardTitle className="font-headline text-lg">Filtros Inteligentes</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1"><Label className="text-xs">Tipo de Material</Label><MultiSelectFilter title="Tipos" options={materialTypes.map(t => ({ value: t, label: t }))} selected={filterTypes} onSelectedChange={setFilterTypes} /></div>
                    <div className="space-y-1"><Label className="text-xs">Especialidad</Label><MultiSelectFilter title="Especialidades" options={specializations.map(s => ({ value: s, label: s }))} selected={filterSpecializations} onSelectedChange={setFilterSpecializations} /></div>
                    <div className="space-y-1"><Label className="text-xs">Ubicación (Móviles)</Label><MultiSelectFilter title="Móviles" options={vehicles.map(v => ({ value: v.id, label: `Móvil ${v.numeroMovil}` }))} selected={filterVehicles} onSelectedChange={setFilterVehicles} /></div>
                    <div className="space-y-1"><Label className="text-xs">Medidas/Diámetros</Label><MultiSelectFilter title="Medidas" options={availableDiameters.map(d => ({ value: d, label: d }))} selected={filterDiameters} onSelectedChange={setFilterDiameters} /></div>
                    <div className="space-y-1"><Label className="text-xs">Cuartel</Label><MultiSelectFilter title="Cuarteles" options={firehouses.map(fh => ({ value: fh, label: fh }))} selected={filterFirehouses} onSelectedChange={setFilterFirehouses} /></div>
                    <div className="space-y-1"><Label className="text-xs">Estado</Label><MultiSelectFilter title="Estados" options={['En Servicio', 'Fuera de Servicio'].map(s => ({ value: s, label: s }))} selected={filterStates} onSelectedChange={setFilterStates} /></div>
                    <div className="space-y-1"><Label className="text-xs">Condición</Label><MultiSelectFilter title="Condiciones" options={['Bueno', 'Regular', 'Malo'].map(c => ({ value: c, label: c }))} selected={filterConditions} onSelectedChange={setFilterConditions} /></div>
                    <div className="flex items-end pb-1"><Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setFilterTypes([]); setFilterFirehouses([]); setFilterSpecializations([]); setFilterVehicles([]); setFilterDiameters([]); setFilterStates([]); setFilterConditions([]); }} className="text-xs">Limpiar Todo</Button></div>
                </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Detalle de Equipamiento ({filteredMaterials.length})</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Medida</TableHead>
                                    <TableHead>Ubicación</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? <TableRow><TableCell colSpan={6}><Skeleton className="h-20 w-full"/></TableCell></TableRow> : 
                                filteredMaterials.length > 0 ? filteredMaterials.map(m => (
                                    <TableRow key={m.id}>
                                        <TableCell className="font-mono text-xs font-bold">{m.codigo}</TableCell>
                                        <TableCell className="text-sm">{m.nombre}</TableCell>
                                        <TableCell className="font-bold text-primary">{m.medida || '-'}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{m.ubicacion.type === 'vehiculo' ? `Móvil ${m.vehiculo?.numeroMovil} (B:${m.ubicacion.baulera})` : `Depósito ${m.cuartel}`}</TableCell>
                                        <TableCell><Badge variant={m.estado === 'En Servicio' ? 'default' : 'destructive'} className={cn("text-[10px]", m.estado === 'En Servicio' && 'bg-green-600')}>{m.estado}</Badge></TableCell>
                                        <TableCell>
                                            <EditMaterialDialog material={m} onMaterialUpdated={handleDataChange}><Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4"/></Button></EditMaterialDialog>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={6} className="h-24 text-center">No se encontraron materiales.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Export and Advanced Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="font-headline">Exportar Reporte PDF</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2"><Switch id="kpi" checked={includeKPIs} onCheckedChange={setIncludeKPIs} /><Label htmlFor="kpi">Incluir KPIs</Label></div>
                            <div className="flex items-center space-x-2"><Switch id="detail" checked={includeInventoryDetails} onCheckedChange={setIncludeInventoryDetails} /><Label htmlFor="detail">Incluir Listado</Label></div>
                        </div>
                        <Button onClick={generatePdf} disabled={generatingPdf || filteredMaterials.length === 0} className="w-full">
                            {generatingPdf ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />} Generar Reporte
                        </Button>
                    </CardContent>
                </Card>

                {canManageGlobally && (
                    <Card className="border-destructive/20 bg-destructive/5">
                        <CardHeader><CardTitle className="text-destructive font-headline">Zona de Peligro</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>Objetivo de Borrado</Label>
                                    <Select value={deleteTarget} onValueChange={setDeleteTarget}>
                                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todo el Inventario</SelectItem>
                                            {vehicles.map(v => <SelectItem key={v.id} value={v.id}>Móvil {v.numeroMovil}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Confirmar (Escriba ELIMINAR)</Label>
                                    <Input placeholder="ELIMINAR" className="bg-background" value={confirmationText} onChange={e => setConfirmationText(e.target.value)} />
                                </div>
                            </div>
                            <Button variant="destructive" className="w-full" onClick={handleBulkDelete} disabled={confirmationText !== 'ELIMINAR'}><Trash className="mr-2" /> Ejecutar Borrado Masivo</Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
