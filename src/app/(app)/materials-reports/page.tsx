
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Download, Loader2, Package, Shield, HeartPulse, Search, ChevronsUpDown, Check, Ruler, QrCode, Trash, Edit, Layers, Settings2 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Material, Vehicle, Specialization } from "@/lib/types";
import { getMaterials } from "@/services/materials.service";
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
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import QrScannerDialog from "../materials/_components/qr-scanner-dialog";
import { MATERIAL_CATEGORIES } from "@/app/lib/constants/material-categories";

const STATUS_COLORS: Record<string, string> = { 'En Servicio': "#22C55E", 'Fuera de Servicio': "#EF4444" };
const acopleOptions = ['Storz', 'NH', 'QC', 'DSP', 'Withworth', 'Otro'];
const diameterOptions = ['25mm', '38mm', '44.5mm', '63.5mm', '70mm'];

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
    const [materials, setMaterials] = useState<Material[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filtros Jerárquicos
    const [filterCategories, setFilterCategories] = useState<string[]>([]);
    const [filterSubCategories, setFilterSubCategories] = useState<string[]>([]);
    const [filterItemTypes, setFilterItemTypes] = useState<string[]>([]);
    
    // Filtros Técnicos
    const [filterAcoples, setFilterAcoples] = useState<string[]>([]);
    const [filterMedidas, setFilterMedidas] = useState<string[]>([]);
    
    // Filtros Ubicación
    const [filterFirehouses, setFilterFirehouses] = useState<string[]>([]);
    const [filterVehicles, setFilterVehicles] = useState<string[]>([]);
    const [filterStates, setFilterStates] = useState<string[]>([]);
    
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [includeKPIs, setIncludeKPIs] = useState(true);
    const [includeInventoryDetails, setIncludeInventoryDetails] = useState(true);

    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);

    const handleDataChange = async () => {
        setLoading(true);
        try {
            const [m, v] = await Promise.all([getMaterials(), getVehicles()]);
            setMaterials(m);
            setVehicles(v);
        } catch (error) {
             toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        handleDataChange();
        fetch('https://i.ibb.co/yF0SYDNF/logo.png').then(r => r.blob()).then(b => {
            const reader = new FileReader();
            reader.onloadend = () => setLogoDataUrl(reader.result as string);
            reader.readAsDataURL(b);
        });
    }, []);

    // Opciones dinámicas para los filtros jerárquicos
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

    const filteredMaterials = useMemo(() => {
        return materials.filter(m => {
            if (searchTerm && !m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) && !m.codigo.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            
            // Jerarquía
            if (filterCategories.length > 0 && !filterCategories.includes(m.categoryId)) return false;
            if (filterSubCategories.length > 0 && !filterSubCategories.includes(m.subCategoryId)) return false;
            if (filterItemTypes.length > 0 && !filterItemTypes.includes(m.itemTypeId)) return false;
            
            // Técnico
            if (filterAcoples.length > 0 && (!m.acople || !filterAcoples.includes(m.acople))) return false;
            if (filterMedidas.length > 0 && (!m.medida || !filterMedidas.includes(m.medida))) return false;

            // Ubicación
            if (filterFirehouses.length > 0 && !filterFirehouses.includes(m.cuartel)) return false;
            if (filterVehicles.length > 0 && (!m.ubicacion?.vehiculoId || !filterVehicles.includes(m.ubicacion.vehiculoId))) return false;
            
            // Estado
            if (filterStates.length > 0 && !filterStates.includes(m.estado)) return false;
            
            return true;
        });
    }, [materials, searchTerm, filterCategories, filterSubCategories, filterItemTypes, filterAcoples, filterMedidas, filterFirehouses, filterVehicles, filterStates]);

    const kpis = useMemo(() => {
        const total = filteredMaterials.length;
        if (total === 0) return { total: 0, servicePercent: '0%', goodPercent: '0%' };
        const inService = filteredMaterials.filter(m => m.estado === 'En Servicio').length;
        const good = filteredMaterials.filter(m => m.condicion === 'Bueno').length;
        return { total, servicePercent: `${((inService / total) * 100).toFixed(0)}%`, goodPercent: `${((good / total) * 100).toFixed(0)}%` };
    }, [filteredMaterials]);

    const generatePdf = async () => {
        if (!logoDataUrl) {
            toast({ title: "Espere un momento", description: "Cargando logo..." });
            return;
        }
        setGeneratingPdf(true);
        const doc = new jsPDF('l', 'mm', 'a4'); // Paisaje para más columnas
        try {
            doc.setFillColor(220, 53, 69);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
            doc.text("Reporte de Inventario Técnico", 14, 22);
            doc.addImage(logoDataUrl, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');

            let currentY = 45;
            if (includeKPIs) {
                doc.setFontSize(14); doc.setTextColor(40);
                doc.text(`Operatividad de Dotación: ${kpis.servicePercent}`, 14, currentY);
                currentY += 10;
            }

            if (includeInventoryDetails && filteredMaterials.length > 0) {
                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Código', 'Nombre', 'Marca/Modelo', 'Ubicación', 'Medida', 'Acople', 'Estado']],
                    body: filteredMaterials.map(m => [
                        m.codigo || 'S/C', 
                        m.nombre,
                        `${m.marca || ''} ${m.modelo || ''}`.trim() || 'N/A',
                        m.ubicacion.type === 'vehiculo' ? `Móv. ${m.vehiculo?.numeroMovil}` : `Dep. ${m.cuartel}`,
                        m.medida || '-',
                        m.acople || '-',
                        m.estado
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: '#343a40' },
                    styles: { fontSize: 8 }
                });
            }
            doc.save(`reporte-materiales-detallado-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingPdf(false); }
    };

    return (
        <div className="space-y-8 pb-20">
            <PageHeader title="Reportes Avanzados de Materiales" description="Filtre por cualquier parámetro técnico para obtener inventarios precisos."/>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-3">
                    <CardHeader><CardTitle className="text-lg">Búsqueda Rápida</CardTitle></CardHeader>
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
                <Card className="border-primary/50 bg-primary/5">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Materiales en Filtro</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">{filteredMaterials.length}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Elementos que cumplen el criterio</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-md">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-base flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Filtros de Clasificación Jerárquica</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold">1. Categoría</Label>
                        <MultiSelectFilter title="Categorías" options={MATERIAL_CATEGORIES.map(c => ({ value: c.id, label: c.label }))} selected={filterCategories} onSelectedChange={(v) => { setFilterCategories(v); setFilterSubCategories([]); setFilterItemTypes([]); }} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold">2. Subcategoría</Label>
                        <MultiSelectFilter title="Subcategorías" options={subCategoryOptions} selected={filterSubCategories} onSelectedChange={(v) => { setFilterSubCategories(v); setFilterItemTypes([]); }} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold">3. Tipo de Ítem</Label>
                        <MultiSelectFilter title="Tipos" options={itemTypeOptions} selected={filterItemTypes} onSelectedChange={setFilterItemTypes} />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /> Filtros Técnicos</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold">Acople</Label>
                            <MultiSelectFilter title="Acoples" options={acopleOptions.map(a => ({ value: a, label: a }))} selected={filterAcoples} onSelectedChange={setFilterAcoples} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold">Medida / Diámetro</Label>
                            <MultiSelectFilter title="Medidas" options={diameterOptions.map(d => ({ value: d, label: d }))} selected={filterMedidas} onSelectedChange={setFilterMedidas} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Filtros de Ubicación y Estado</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold">Cuartel</Label>
                            <MultiSelectFilter title="Cuarteles" options={['Cuartel 1', 'Cuartel 2', 'Cuartel 3'].map(fh => ({ value: fh, label: fh }))} selected={filterFirehouses} onSelectedChange={setFilterFirehouses} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold">Móvil</Label>
                            <MultiSelectFilter title="Móviles" options={vehicles.map(v => ({ value: v.id, label: `Móv ${v.numeroMovil}` }))} selected={filterVehicles} onSelectedChange={setFilterVehicles} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold">Estado</Label>
                            <MultiSelectFilter title="Estados" options={['En Servicio', 'Fuera de Servicio'].map(s => ({ value: s, label: s }))} selected={filterStates} onSelectedChange={setFilterStates} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="border-b">
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Detalle de Equipamiento</CardTitle>
                        <div className="flex gap-2">
                            <Button onClick={generatePdf} disabled={generatingPdf || filteredMaterials.length === 0}>
                                {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                Generar PDF Detallado
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Código</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Ubicación</TableHead>
                                <TableHead>Medida</TableHead>
                                <TableHead>Acople</TableHead>
                                <TableHead className="text-right">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6}><Skeleton className="h-10 w-full"/></TableCell></TableRow>
                            ) : filteredMaterials.length > 0 ? (
                                filteredMaterials.map(m => (
                                    <TableRow key={m.id} className="hover:bg-muted/50">
                                        <TableCell className="font-mono text-xs font-bold">{m.codigo || '-'}</TableCell>
                                        <TableCell className="text-sm font-medium">
                                            {m.nombre}
                                            <span className="block text-[10px] text-muted-foreground">{m.marca} {m.modelo}</span>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {m.ubicacion.type === 'vehiculo' ? `Móvil ${m.vehiculo?.numeroMovil}` : `Depósito ${m.cuartel}`}
                                        </TableCell>
                                        <TableCell className="text-xs">{m.medida || '-'}</TableCell>
                                        <TableCell className="text-xs">{m.acople || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge className={cn("text-[10px]", m.estado === 'En Servicio' ? 'bg-green-600' : 'bg-red-600')}>
                                                {m.estado}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                                        No se encontraron materiales con los filtros aplicados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
