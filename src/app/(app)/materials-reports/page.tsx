
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Download, Loader2, Package, Shield, HeartPulse, Search, ChevronsUpDown, Check, Ruler, QrCode, Trash, Edit, Layers } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Material, Vehicle } from "@/lib/types";
import { getMaterials, deleteAllMaterials } from "@/services/materials.service";
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
const CONDITION_COLORS: Record<string, string> = { 'Bueno': "#22C55E", 'Regular': "#FBBF24", 'Malo': "#F97316" };

const MultiSelectFilter = ({ title, options, selected, onSelectedChange, searchPlaceholder }: { title: string; options: { value: string; label: string }[]; selected: string[]; onSelectedChange: (selected: string[]) => void; searchPlaceholder?: string; }) => {
    const [open, setOpen] = useState(false);
    const handleSelect = (value: string) => {
        const isSelected = selected.includes(value);
        onSelectedChange(isSelected ? selected.filter(s => s !== value) : [...selected, value]);
    };
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-10 text-xs">
                    <div className="flex gap-1 flex-wrap">
                         {selected.length > 0 ? selected.map(v => <Badge variant="secondary" key={v} className="text-[10px]">{options.find(o => o.value === v)?.label || v}</Badge>) : `Seleccionar ${title.toLowerCase()}...`}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder || `Buscar...`} />
                    <CommandList>
                        <CommandEmpty>Sin resultados.</CommandEmpty>
                        <CommandGroup>{options.map((opt) => (<CommandItem key={opt.value} value={opt.label} onSelect={() => handleSelect(opt.value)}><Check className={cn("mr-2 h-4 w-4", selected.includes(opt.value) ? "opacity-100" : "opacity-0")} />{opt.label}</CommandItem>))}</CommandGroup>
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
    const [filterCategories, setFilterCategories] = useState<string[]>([]);
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
    const canManageGlobally = activeRole === 'Master' || activeRole === 'Administrador';

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

    const filteredMaterials = useMemo(() => {
        return materials.filter(m => {
            if (searchTerm && !m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) && !m.codigo.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (filterCategories.length > 0 && !filterCategories.includes(m.categoryId)) return false;
            if (filterFirehouses.length > 0 && !filterFirehouses.includes(m.cuartel)) return false;
            if (filterVehicles.length > 0 && (!m.ubicacion?.vehiculoId || !filterVehicles.includes(m.ubicacion.vehiculoId))) return false;
            if (filterStates.length > 0 && !filterStates.includes(m.estado)) return false;
            return true;
        });
    }, [materials, searchTerm, filterCategories, filterFirehouses, filterVehicles, filterStates]);

    const kpis = useMemo(() => {
        const total = filteredMaterials.length;
        if (total === 0) return { total: 0, servicePercent: '0%', goodPercent: '0%' };
        const inService = filteredMaterials.filter(m => m.estado === 'En Servicio').length;
        const good = filteredMaterials.filter(m => m.condicion === 'Bueno').length;
        return { total, servicePercent: `${((inService / total) * 100).toFixed(0)}%`, goodPercent: `${((good / total) * 100).toFixed(0)}%` };
    }, [filteredMaterials]);

    const chartData = useMemo(() => {
        const status = filteredMaterials.reduce((acc, m) => { acc[m.estado] = (acc[m.estado] || 0) + 1; return acc; }, {} as Record<string, number>);
        return Object.entries(status).map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] || '#ccc' }));
    }, [filteredMaterials]);

    const generatePdf = async () => {
        if (!logoDataUrl) return;
        setGeneratingPdf(true);
        const doc = new jsPDF();
        try {
            doc.setFillColor(220, 53, 69);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22); doc.setTextColor(255); doc.setFont('helvetica', 'bold');
            doc.text("Reporte de Inventario Estratégico", 14, 22);
            doc.addImage(logoDataUrl, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');

            let currentY = 45;
            if (includeKPIs) {
                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Métrica', 'Valor']],
                    body: [['Total Equipos', kpis.total], ['Operatividad', kpis.servicePercent], ['Buen Estado', kpis.goodPercent]],
                    theme: 'grid',
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
            }

            if (includeInventoryDetails && filteredMaterials.length > 0) {
                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Código', 'Nombre', 'Ubicación', 'Estado']],
                    body: filteredMaterials.map(m => [
                        m.codigo, m.nombre,
                        m.ubicacion.type === 'vehiculo' ? `Mov. ${m.vehiculo?.numeroMovil}` : `Dep. ${m.cuartel}`,
                        m.estado
                    ]),
                    theme: 'striped',
                });
            }
            doc.save(`inventario-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally { setGeneratingPdf(false); }
    };

    return (
        <div className="space-y-8 pb-20">
            <PageHeader title="Consola de Inventario" description="Gestión jerárquica y análisis de activos del departamento."/>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="text-lg">Búsqueda Directa</CardTitle></CardHeader>
                    <CardContent className="flex gap-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Código o Nombre..." className="pl-9 h-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <QrScannerDialog onScan={(c) => {setSearchTerm(c); toast({title: "QR Escaneado", description: c});}}>
                            <Button size="lg" variant="outline" className="h-12"><QrCode className="mr-2" />Escanear</Button>
                        </QrScannerDialog>
                    </CardContent>
                </Card>
                <Card className="border-primary/50 bg-primary/5">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Operatividad</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-primary">{kpis.servicePercent}</div><p className="text-xs text-muted-foreground mt-1">Sistemas en servicio activo</p></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle className="text-lg">Filtros Avanzados</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs">Categoría Principal</Label>
                        <MultiSelectFilter title="Categorías" options={MATERIAL_CATEGORIES.map(c => ({ value: c.id, label: c.label }))} selected={filterCategories} onSelectedChange={setFilterCategories} />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Ubicación (Móviles)</Label>
                        <MultiSelectFilter title="Móviles" options={vehicles.map(v => ({ value: v.id, label: `Móvil ${v.numeroMovil}` }))} selected={filterVehicles} onSelectedChange={setFilterVehicles} />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Cuartel</Label>
                        <MultiSelectFilter title="Cuarteles" options={['Cuartel 1', 'Cuartel 2', 'Cuartel 3'].map(fh => ({ value: fh, label: fh }))} selected={filterFirehouses} onSelectedChange={setFilterFirehouses} />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Estado</Label>
                        <MultiSelectFilter title="Estados" options={['En Servicio', 'Fuera de Servicio'].map(s => ({ value: s, label: s }))} selected={filterStates} onSelectedChange={setFilterStates} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="font-headline">Detalle de Equipamiento ({filteredMaterials.length})</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Ubicación</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-10 w-full"/></TableCell></TableRow> : 
                            filteredMaterials.map(m => (
                                <TableRow key={m.id}>
                                    <TableCell className="font-mono text-xs font-bold">{m.codigo}</TableCell>
                                    <TableCell className="text-sm font-medium">{m.nombre}</TableCell>
                                    <TableCell className="text-xs">{m.ubicacion.type === 'vehiculo' ? `Mov. ${m.vehiculo?.numeroMovil}` : `Dep. ${m.cuartel}`}</TableCell>
                                    <TableCell><Badge className={cn("text-[10px]", m.estado === 'En Servicio' ? 'bg-green-600' : 'bg-red-600')}>{m.estado}</Badge></TableCell>
                                    <TableCell>
                                        <EditMaterialDialog material={m} onMaterialUpdated={handleDataChange}><Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4"/></Button></EditMaterialDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Exportación Modular</CardTitle></CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-6">
                    <div className="flex items-center space-x-2"><Switch id="kpi" checked={includeKPIs} onCheckedChange={setIncludeKPIs} /><Label htmlFor="kpi">Incluir KPIs</Label></div>
                    <div className="flex items-center space-x-2"><Switch id="list" checked={includeInventoryDetails} onCheckedChange={setIncludeInventoryDetails} /><Label htmlFor="list">Incluir Listado</Label></div>
                    <Button onClick={generatePdf} disabled={generatingPdf || filteredMaterials.length === 0} className="ml-auto">
                        {generatingPdf ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />} Generar PDF
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
