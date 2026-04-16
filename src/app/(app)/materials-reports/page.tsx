
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Package, Shield, HeartPulse, Search, ChevronsUpDown, Check, Ruler, QrCode, Trash2, Edit, Layers, Settings2, MapPin, Activity, Droplets, ArrowUpDown, ArrowUp, ArrowDown, Eye, List, FileText, LayoutList, MoreHorizontal } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Material, Vehicle, Firefighter } from "@/lib/types";
import { getMaterials, deleteMaterial } from "@/services/materials.service";
import { getVehicles } from "@/services/vehicles.service";
import { getFirefighters } from "@/services/firefighters.service";
import { createMaterialRequest } from "@/services/material-requests.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import EditMaterialDialog from "../materials/_components/edit-material-dialog";
import MaterialDetailDialog from "../materials/_components/material-detail-dialog";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import QrScannerDialog from "../materials/_components/qr-scanner-dialog";
import { MATERIAL_CATEGORIES } from "@/app/lib/constants/material-categories";
import { APP_CONFIG } from "@/lib/config";

const STATUS_COLORS: Record<string, string> = { 'En Servicio': "#22C55E", 'Fuera de Servicio': "#EF4444" };
const acopleOptions = ['Storz', 'NH', 'QC', 'DSP', 'Withworth', 'Otro'];
const diameterOptions = ['25mm', '38mm', '44.5mm', '63.5mm', '70mm'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (!percent || percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[11px] font-bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const MultiSelectFilter = ({ 
    title, 
    options, 
    selected, 
    onSelectedChange, 
    searchPlaceholder 
}: { 
    title: string; 
    options: { value: string; label: string }[]; 
    selected: string[]; 
    onSelectedChange: (selected: string[]) => void; 
    searchPlaceholder?: string; 
}) => {
    const [open, setOpen] = useState(false);
    const handleSelect = (value: string) => {
        const isSelected = selected.includes(value);
        onSelectedChange(isSelected ? selected.filter(s => s !== value) : [...selected, value]);
    };
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-10 text-xs text-left">
                    <div className="flex gap-1 flex-wrap">
                         {selected.length > 0 ? selected.map(v => (
                             <Badge variant="secondary" key={v} className="text-[10px] py-0 px-1">
                                 {options.find(o => o.value === v)?.label || v}
                             </Badge>
                         )) : `Filtrar ${title.toLowerCase()}...`}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder || `Buscar...`} />
                    <CommandList>
                        <CommandEmpty>Sin resultados.</CommandEmpty>
                        <CommandGroup>
                            {options.map((opt) => (
                                <CommandItem key={opt.value} value={opt.label} onSelect={() => handleSelect(opt.value)}>
                                    <Check className={cn("mr-2 h-4 w-4", selected.includes(opt.value) ? "opacity-100" : "opacity-0")} />
                                    {opt.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default function MaterialsReportPage() {
    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailItem, setDetailItem] = useState<Material | null>(null);
    
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>({ key: 'codigo', direction: 'ascending' });

    const [filterCategories, setFilterCategories] = useState<string[]>([]);
    const [filterSubCategories, setFilterSubCategories] = useState<string[]>([]);
    const [filterItemTypes, setFilterItemTypes] = useState<string[]>([]);
    
    const [filterAcoples, setFilterAcoples] = useState<string[]>([]);
    const [filterMedidas, setFilterMedidas] = useState<string[]>([]);
    const [filterComposiciones, setFilterComposiciones] = useState<string[]>([]);
    
    const [filterFirehouses, setFilterFirehouses] = useState<string[]>([]);
    const [filterLocations, setFilterLocations] = useState<string[]>([]);
    const [filterStates, setFilterStates] = useState<string[]>([]);
    
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    
    const [includeKPIs, setIncludeKPIs] = useState(true);
    const [includeInventoryDetails, setIncludeInventoryDetails] = useState(true);

    const activeRole = getActiveRole(pathname);
    const isPrivileged = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);
    const isEncargado = useMemo(() => activeRole === 'Encargado', [activeRole]);

    const handleDataChange = async () => {
        setLoading(true);
        try {
            const [m, v, f] = await Promise.all([getMaterials(), getVehicles(), getFirefighters()]);
            setMaterials(m);
            setVehicles(v);
            setFirefighters(f);
        } catch (error) {
             toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        handleDataChange();
        fetch(APP_CONFIG.logoUrl).then(r => r.blob()).then(b => {
            const reader = new FileReader();
            reader.onloadend = () => setLogoDataUrl(reader.result as string);
            reader.readAsDataURL(b);
        });
    }, []);

    const loggedInFirefighter = useMemo(() => {
        if (!user || firefighters.length === 0) return null;
        return firefighters.find(f => f.legajo === user.id);
    }, [user, firefighters]);

    const managedVehicleIds = useMemo(() => {
        if (!loggedInFirefighter || !isEncargado) return new Set<string>();
        return new Set(vehicles.filter(v => v.materialEncargadoIds?.includes(loggedInFirefighter.id)).map(v => v.id));
    }, [loggedInFirefighter, vehicles, isEncargado]);

    const canEditMaterial = (m: Material) => {
        if (isPrivileged) return true;
        if (isEncargado && m.ubicacion.type === 'vehiculo' && m.ubicacion.vehiculoId && managedVehicleIds.has(m.ubicacion.vehiculoId)) {
            return true;
        }
        return false;
    };

    const canDeleteMaterial = (m: Material) => {
        if (isPrivileged) return true;
        if (isEncargado && m.ubicacion.type === 'vehiculo' && m.ubicacion.vehiculoId && managedVehicleIds.has(m.ubicacion.vehiculoId)) {
            return true;
        }
        return false;
    };

    const handleDelete = async (m: Material) => {
        if (!user) return;
        if (isPrivileged) {
            try {
                await deleteMaterial(m.id, user);
                toast({ title: "Material eliminado" });
                handleDataChange();
            } catch (error: any) {
                toast({ variant: "destructive", title: "Error", description: error.message });
            }
        } else if (isEncargado) {
            try {
                await createMaterialRequest({
                    type: 'DELETE',
                    materialId: m.id,
                    materialNombre: m.nombre,
                    materialCodigo: m.codigo,
                    requestedById: user.id,
                    requestedByName: user.name,
                    data: {},
                    originalData: m
                });
                toast({ title: "Solicitud de baja enviada", description: "Un administrador deberá confirmar la baja." });
            } catch (error: any) {
                toast({ variant: "destructive", title: "Error", description: error.message });
            }
        }
    };

    const subCategoryOptions = useMemo(() => {
        if (filterCategories.length === 0) return [];
        return MATERIAL_CATEGORIES
            .filter(c => filterCategories.includes(c.id))
            .flatMap(c => c.subCategories.map(s => ({ value: s.id, label: s.label })));
    }, [filterCategories]);

    const itemTypeOptions = useMemo(() => {
        if (filterSubCategories.length === 0) return [];
        return MATERIAL_CATEGORIES
            .flatMap(c => c.subCategories)
            .filter(s => filterSubCategories.includes(s.id))
            .flatMap(s => s.items.map(i => ({ value: i.id, label: i.label })));
    }, [filterSubCategories]);

    const locationOptions = useMemo(() => {
        return [
            ...vehicles.map(v => ({ value: v.id, label: `Móvil ${v.numeroMovil}` })),
            { value: 'deposito', label: 'Depósito' }
        ];
    }, [vehicles]);

    const filteredMaterials = useMemo(() => {
        return materials.filter(m => {
            if (searchTerm && !m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) && !m.codigo.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (filterCategories.length > 0 && !filterCategories.includes(m.categoryId)) return false;
            if (filterSubCategories.length > 0 && !filterSubCategories.includes(m.subCategoryId)) return false;
            if (filterItemTypes.length > 0 && !filterItemTypes.includes(m.itemTypeId)) return false;
            if (filterAcoples.length > 0 && (!m.acople || !filterAcoples.includes(m.acople))) return false;
            if (filterMedidas.length > 0 && (!m.medida || !filterMedidas.includes(m.medida))) return false;
            if (filterComposiciones.length > 0 && (!m.composicion || !filterComposiciones.includes(m.composicion))) return false;
            if (filterFirehouses.length > 0 && !filterFirehouses.includes(m.cuartel)) return false;
            
            if (filterLocations.length > 0) {
                const loc = m.ubicacion;
                const isMatch = (loc.type === 'vehiculo' && loc.vehiculoId && filterLocations.includes(loc.vehiculoId)) ||
                                (loc.type === 'deposito' && filterLocations.includes('deposito'));
                if (!isMatch) return false;
            }

            if (filterStates.length > 0 && !filterStates.includes(m.estado)) return false;
            return true;
        });
    }, [materials, searchTerm, filterCategories, filterSubCategories, filterItemTypes, filterAcoples, filterMedidas, filterComposiciones, filterFirehouses, filterLocations, filterStates]);

    const inventorySummary = useMemo(() => {
        if (filteredMaterials.length === 0) return [];

        const itemTypeMap = new Map<string, string>();
        MATERIAL_CATEGORIES.forEach(cat => {
            cat.subCategories.forEach(sub => {
                sub.items.forEach(item => {
                    const parts = item.label.split(' ');
                    itemTypeMap.set(item.id, parts.slice(1).join(' '));
                });
            });
        });

        const summary: Record<string, number> = {};

        filteredMaterials.forEach(m => {
            const baseType = itemTypeMap.get(m.itemTypeId) || m.nombre;
            const measureInfo = m.medida ? ` ${m.medida}` : '';
            const couplingInfo = m.acople ? ` (${m.acople})` : '';
            
            const fullLabel = `${baseType}${measureInfo}${couplingInfo}`.trim();
            summary[fullLabel] = (summary[fullLabel] || 0) + 1;
        });

        return Object.entries(summary).sort((a, b) => b[1] - a[1]);
    }, [filteredMaterials]);

    const sortedFilteredMaterials = useMemo(() => {
        let sortableItems = [...filteredMaterials];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof Material];
                let bValue: any = b[sortConfig.key as keyof Material];
                if (sortConfig.key === 'ubicacion') {
                    const getLocString = (m: Material) => m.ubicacion.type === 'vehiculo' 
                        ? `V-${m.vehiculo?.numeroMovil?.padStart(3, '0') || '999'}-${m.ubicacion.baulera}`
                        : `D-${m.cuartel}`;
                    aValue = getLocString(a);
                    bValue = getLocString(b);
                }
                if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                if (typeof bValue === 'string') bValue = bValue.toLowerCase();
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredMaterials, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
        return sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
    };

    const kpis = useMemo(() => {
        const total = filteredMaterials.length;
        if (total === 0) return { total: 0, inService: 0, outOfService: 0, good: 0, regular: 0, bad: 0, servicePercent: '0%', goodPercent: '0%' };
        const inService = filteredMaterials.filter(m => m.estado === 'En Servicio').length;
        const outOfService = total - inService;
        const good = filteredMaterials.filter(m => m.condicion === 'Bueno').length;
        const regular = filteredMaterials.filter(m => m.condicion === 'Regular').length;
        const bad = filteredMaterials.filter(m => m.condicion === 'Malo').length;
        return { total, inService, outOfService, good, regular, bad, servicePercent: `${((inService / total) * 100).toFixed(0)}%`, goodPercent: `${((good / total) * 100).toFixed(0)}%` };
    }, [filteredMaterials]);

    const generatePdf = async () => {
        if (!logoDataUrl) return;
        setGeneratingPdf(true);
        const doc = new jsPDF('l', 'mm', 'a4'); 
        try {
            doc.setFillColor(220, 53, 69);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
            doc.text(`Inventario Técnico - ${APP_CONFIG.name}`, 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');

            let currentY = 45;
            if (includeKPIs) {
                doc.setFontSize(14); doc.setTextColor(40);
                doc.text(`Resumen Cuantitativo desglosado por variante`, 14, currentY); currentY += 10;
                
                if (inventorySummary.length > 0) {
                    (doc as any).autoTable({
                        startY: currentY,
                        head: [['Variante Técnica (Tipo, Medida, Acople)', 'Cantidad Total']],
                        body: inventorySummary.map(([label, count]) => [label, count]),
                        theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: '#666' }
                    });
                    currentY = (doc as any).lastAutoTable.finalY + 10;
                }
            }

            if (includeInventoryDetails && sortedFilteredMaterials.length > 0) {
                if (currentY > 180) { doc.addPage(); currentY = 20; }
                doc.setFontSize(14); doc.setTextColor(40); doc.setFont('helvetica', 'bold');
                doc.text(`Detalle Individual de Equipamiento`, 14, currentY); currentY += 6;
                
                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Código', 'Nombre', 'Ubicación', 'Medida', 'Acople', 'Estado']],
                    body: sortedFilteredMaterials.map(m => [
                        m.codigo || 'S/C', 
                        m.nombre,
                        m.ubicacion.type === 'vehiculo' ? `Móv. ${m.vehiculo?.numeroMovil}` : `Depósito`,
                        m.medida || '-',
                        m.acople || '-',
                        m.estado
                    ]),
                    theme: 'striped', headStyles: { fillColor: '#343a40' }, styles: { fontSize: 8 }
                });
            }
            doc.save(`reporte-materiales-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingPdf(false); }
    };

    const pieData = useMemo(() => {
        return [
            { name: 'En Servicio', value: kpis.inService, fill: STATUS_COLORS['En Servicio'] },
            { name: 'Fuera de Servicio', value: kpis.outOfService, fill: STATUS_COLORS['Fuera de Servicio'] }
        ].filter(d => d.value > 0);
    }, [kpis]);

    if (loading) return <Skeleton className="w-full h-[600px]" />;

    return (
        <div className="space-y-8 pb-20">
            <PageHeader title="Informes de Materiales" description="Gestione y audite el equipamiento técnico de la flota y depósitos."/>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-3 shadow-sm">
                    <CardHeader className="pb-3"><CardTitle className="text-lg font-headline">Búsqueda Rápida</CardTitle></CardHeader>
                    <CardContent className="flex gap-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar por código o nombre..." className="pl-9 h-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <QrScannerDialog onScan={(c) => setSearchTerm(c)}>
                            <Button size="lg" variant="outline" className="h-12"><QrCode className="mr-2 h-5 w-5" />Escanear</Button>
                        </QrScannerDialog>
                    </CardContent>
                </Card>
                <Card className="border-primary/50 bg-primary/5 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Seleccionado</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">{filteredMaterials.length}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Ítems según filtros actuales</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="md:col-span-1 h-64 shadow-md overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Estado Operativo</CardTitle></CardHeader>
                    <CardContent className="h-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={pieData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={35} 
                                    outerRadius={90} 
                                    labelLine={false} 
                                    label={renderCustomizedLabel}
                                    strokeWidth={2}
                                >
                                    {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><Activity className="h-3 w-3" /> Operatividad</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-center"><span className="text-sm font-medium">En Servicio:</span><span className="text-xl font-bold text-green-600">{kpis.inService}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm font-medium">Fuera de Servicio:</span><span className="text-xl font-bold text-red-600">{kpis.outOfService}</span></div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><Shield className="h-3 w-3" /> Condición Física</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2">
                        <div className="text-center"><p className="text-[10px] text-muted-foreground">Bueno</p><p className="text-lg font-bold text-green-600">{kpis.good}</p></div>
                        <div className="text-center"><p className="text-[10px] text-muted-foreground">Regular</p><p className="text-lg font-bold text-amber-600">{kpis.regular}</p></div>
                        <div className="text-center"><p className="text-[10px] text-muted-foreground">Malo</p><p className="text-lg font-bold text-red-600">{kpis.bad}</p></div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-slate-500 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><Layers className="h-3 w-3" /> Integridad de Datos</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center"><span className="text-sm font-medium">Codificados:</span><span className="text-lg font-bold">{filteredMaterials.filter(m => !!m.codigo).length}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm font-medium">Sin Código:</span><span className="text-lg font-bold text-amber-600">{filteredMaterials.filter(m => !m.codigo).length}</span></div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-md">
                <CardHeader className="bg-muted/30 border-b"><CardTitle className="text-base flex items-center gap-2 font-headline"><Layers className="h-5 w-5 text-primary" /> Filtros de Clasificación Jerárquica</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                    <div className="space-y-2"><Label className="text-xs font-bold">1. Categoría</Label><MultiSelectFilter title="Categorías" options={MATERIAL_CATEGORIES.map(c => ({ value: c.id, label: c.label }))} selected={filterCategories} onSelectedChange={(v) => { setFilterCategories(v); setFilterSubCategories([]); setFilterItemTypes([]); }} /></div>
                    <div className="space-y-2"><Label className="text-xs font-bold">2. Subcategoría</Label><MultiSelectFilter title="Subcategorías" options={subCategoryOptions} selected={filterSubCategories} onSelectedChange={(v) => { setFilterSubCategories(v); setFilterItemTypes([]); }} /></div>
                    <div className="space-y-2"><Label className="text-xs font-bold">3. Tipo de Ítem</Label><MultiSelectFilter title="Tipos" options={itemTypeOptions} selected={filterItemTypes} onSelectedChange={setFilterItemTypes} /></div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-md">
                    <CardHeader className="bg-muted/30 border-b"><CardTitle className="text-base flex items-center gap-2 font-headline"><Settings2 className="h-5 w-5 text-primary" /> Filtros Técnicos</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                        <div className="space-y-2"><Label className="text-xs font-bold">Acople</Label><MultiSelectFilter title="Acoples" options={acopleOptions.map(a => ({ value: a, label: a }))} selected={filterAcoples} onSelectedChange={setFilterAcoples} /></div>
                        <div className="space-y-2"><Label className="text-xs font-bold">Medida / Diámetro</Label><MultiSelectFilter title="Medidas" options={diameterOptions.map(d => ({ value: d, label: d }))} selected={filterMedidas} onSelectedChange={setFilterMedidas} /></div>
                        <div className="space-y-2"><Label className="text-xs font-bold">Composición</Label><MultiSelectFilter title="Composición" options={['Tela', 'Goma'].map(c => ({ value: c, label: c }))} selected={filterComposiciones} onSelectedChange={setFilterComposiciones} /></div>
                    </CardContent>
                </Card>
                <Card className="shadow-md">
                    <CardHeader className="bg-muted/30 border-b"><CardTitle className="text-base flex items-center gap-2 font-headline"><MapPin className="h-5 w-5 text-primary" /> Filtros de Ubicación</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                        <div className="space-y-2"><Label className="text-xs font-bold">Cuartel</Label><MultiSelectFilter title="Cuarteles" options={['Cuartel 1', 'Cuartel 2', 'Cuartel 3'].map(fh => ({ value: fh, label: fh }))} selected={filterFirehouses} onSelectedChange={setFilterFirehouses} /></div>
                        <div className="space-y-2"><Label className="text-xs font-bold">Ubicación</Label><MultiSelectFilter title="Ubicaciones" options={locationOptions} selected={filterLocations} onSelectedChange={setFilterLocations} /></div>
                        <div className="space-y-2"><Label className="text-xs font-bold">Estado</Label><MultiSelectFilter title="Estados" options={['En Servicio', 'Fuera de Servicio'].map(s => ({ value: s, label: s }))} selected={filterStates} onSelectedChange={setFilterStates} /></div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-1 border-primary/20 bg-muted/10 h-fit shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" /> Opciones de PDF
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="kpi-opt" checked={includeKPIs} onCheckedChange={(v) => setIncludeKPIs(!!v)} />
                            <Label htmlFor="kpi-opt" className="text-xs cursor-pointer font-bold">Resumen Desglosado (Variantes)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="list-opt" checked={includeInventoryDetails} onCheckedChange={(v) => setIncludeInventoryDetails(!!v)} />
                            <Label htmlFor="list-opt" className="text-xs cursor-pointer">Listado Individual Detallado</Label>
                        </div>
                        <Button className="w-full mt-2" onClick={generatePdf} disabled={generatingPdf || filteredMaterials.length === 0}>
                            {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Descargar Informe
                        </Button>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 shadow-md">
                    <CardHeader className="border-b bg-muted/20">
                        <div className="flex justify-between items-center">
                            <CardTitle className="font-headline text-lg">Detalle de Equipamiento</CardTitle>
                            <Badge variant="outline" className="h-6">{filteredMaterials.length} resultados</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="cursor-pointer text-[11px]" onClick={() => requestSort('codigo')}>Código {getSortIcon('codigo')}</TableHead>
                                    <TableHead className="cursor-pointer text-[11px]" onClick={() => requestSort('nombre')}>Nombre {getSortIcon('nombre')}</TableHead>
                                    <TableHead className="cursor-pointer text-[11px]" onClick={() => requestSort('ubicacion')}>Ubicación {getSortIcon('ubicacion')}</TableHead>
                                    <TableHead className="text-[11px]">Medida</TableHead>
                                    <TableHead className="text-[11px]">Acople</TableHead>
                                    <TableHead className="text-right text-[11px]">Estado</TableHead>
                                    <TableHead className="text-right text-[11px]">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedFilteredMaterials.length > 0 ? sortedFilteredMaterials.map(m => (
                                    <TableRow key={m.id}>
                                        <TableCell className="font-mono text-[10px] font-bold">{m.codigo || 'S/C'}</TableCell>
                                        <TableCell className="text-[11px] font-medium">{m.nombre}</TableCell>
                                        <TableCell className="text-[10px]">{m.ubicacion.type === 'vehiculo' ? `Móv. ${m.vehiculo?.numeroMovil}` : `Depósito`}</TableCell>
                                        <TableCell className="text-[10px]">{m.medida || '-'}</TableCell>
                                        <TableCell className="text-[10px]">{m.acople || '-'}</TableCell>
                                        <TableCell className="text-right"><Badge variant={m.estado === 'En Servicio' ? 'default' : 'destructive'} className="text-[9px] h-5">{m.estado}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <AlertDialog>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3 w-3"/></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => setDetailItem(m)}><Eye className="h-4 w-4 mr-2" /> Ver Detalles</DropdownMenuItem>
                                                            {canEditMaterial(m) && (
                                                                <EditMaterialDialog material={m} onMaterialUpdated={handleDataChange}>
                                                                    <DropdownMenuItem onSelect={e => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/> Editar</DropdownMenuItem>
                                                                </EditMaterialDialog>
                                                            )}
                                                            {canDeleteMaterial(m) && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Eliminar</DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                                            <AlertDialogDescription>{isPrivileged ? "Esta acción eliminará el material permanentemente." : "Se enviará una solicitud de baja para revisión del administrador."}</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(m)} variant="destructive">{isPrivileged ? "Eliminar" : "Enviar Solicitud"}</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (<TableRow><TableCell colSpan={7} className="h-24 text-center italic text-muted-foreground">Sin resultados.</TableCell></TableRow>)}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <MaterialDetailDialog material={detailItem} open={!!detailItem} onOpenChange={(isOpen) => { if (!isOpen) setDetailItem(null); }} />
        </div>
    );
}
