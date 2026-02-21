
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, Edit, Download, Loader2, Package, Shield, HeartPulse, Truck, Search, ChevronsUpDown, Check, Ruler } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Material, Specialization, Vehicle, Firefighter } from "@/lib/types";
import { getMaterials, deleteMaterial, deleteAllMaterials } from "@/services/materials.service";
import { getVehicles } from "@/services/vehicles.service";
import { getFirefighters } from "@/services/firefighters.service";
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
import { Progress } from "@/components/ui/progress";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const materialTypes: Material['tipo'][] = [
    'BOMBEO', 'COMUNICACION', 'DOCUMENTACION', 'ESTABILIZACION', 'H. CORTE', 
    'H. ELECTRICA', 'H. GOLPE', 'H. HIDRAULICA', 'H. NEUMATICA', 'HERRAMIENTA', 
    'ILUMINACION', 'INMOVILIZACION', 'LANZA', 'LOGISTICA', 'MANGA', 'MEDICION', 
    'MEDICO', 'PROTECCION', 'RESPIRACION', 'TRANSPORTE'
].sort() as Material['tipo'][];

const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'GENERAL'];
const firehouses: Material['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

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
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-10">
                    <div className="flex gap-1 flex-wrap">
                         {selected.length > 0 ? (
                            selected.map(value => renderBadge ? renderBadge(value) : <Badge variant="secondary" key={value}>{options.find(o => o.value === value)?.label || value}</Badge>)
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
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Multi-select Filters
    const [filterTypes, setFilterTypes] = useState<string[]>([]);
    const [filterFirehouses, setFilterFirehouses] = useState<string[]>([]);
    const [filterSpecializations, setFilterSpecializations] = useState<string[]>([]);
    const [filterVehicles, setFilterVehicles] = useState<string[]>([]);
    const [filterDiameters, setFilterDiameters] = useState<string[]>([]);
    const [filterStates, setFilterStates] = useState<string[]>([]);
    const [filterConditions, setFilterConditions] = useState<string[]>([]);
    
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    
    // State for deletion
    const [deleteTarget, setDeleteTarget] = useState('all');
    const [confirmationText, setConfirmationText] = useState('');

    const [includeKPIs, setIncludeKPIs] = useState(true);
    const [includeInventoryDetails, setIncludeInventoryDetails] = useState(true);

    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();

    const activeRole = getActiveRole(pathname);
    const canManageGlobally = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [materialsData, vehiclesData, firefightersData] = await Promise.all([
                getMaterials(),
                getVehicles(),
                getFirefighters(),
            ]);
            setMaterials(materialsData);
            setVehicles(vehiclesData);
            setAllFirefighters(firefightersData);
        } catch (error) {
             toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchAllData();
        const fetchLogo = async () => {
             try {
                const response = await fetch('https://i.ibb.co/yF0SYDNF/logo.png');
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => { setLogoDataUrl(reader.result as string); };
                reader.readAsDataURL(blob);
             } catch (error) {
                 console.error("Failed to load logo for PDF", error);
             }
        }
        fetchLogo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDataChange = () => {
        fetchAllData();
    };

    const handleDelete = async (materialId: string) => {
        try {
            await deleteMaterial(materialId, user);
            toast({ title: "¡Éxito!", description: "El material ha sido eliminado." });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo eliminar the material.", variant: "destructive" });
        }
    };

    const handleBulkDelete = async () => {
        const target = deleteTarget === 'all' ? undefined : deleteTarget;
        try {
            const count = await deleteAllMaterials(user, target);
            const targetName = target ? `del Móvil ${vehicles.find(v => v.id === target)?.numeroMovil}` : 'totales';
            toast({ title: "¡Éxito!", description: `Se eliminaron ${count} materiales ${targetName}.` });
            setConfirmationText('');
            fetchAllData();
        } catch (error: any) {
             toast({ title: "Error", description: error.message || "No se pudieron eliminar los materiales.", variant: "destructive" });
        }
    }

    const filteredMaterials = useMemo(() => {
        return materials.filter(material => {
            if (filterTypes.length > 0 && !filterTypes.includes(material.tipo)) return false;
            if (filterFirehouses.length > 0 && !filterFirehouses.includes(material.cuartel)) return false;
            if (filterSpecializations.length > 0 && !filterSpecializations.includes(material.especialidad)) return false;
            if (filterVehicles.length > 0 && (!material.ubicacion?.vehiculoId || !filterVehicles.includes(material.ubicacion.vehiculoId))) return false;
            if (filterDiameters.length > 0 && (!material.medida || !filterDiameters.includes(material.medida))) return false;
            if (filterStates.length > 0 && !filterStates.includes(material.estado)) return false;
            if (filterConditions.length > 0 && !filterConditions.includes(material.condicion)) return false;
            return true;
        });
    }, [materials, filterTypes, filterFirehouses, filterSpecializations, filterVehicles, filterDiameters, filterStates, filterConditions]);

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

    const availableDiameters = useMemo(() => {
        const diameters = new Set<string>();
        materials.forEach(m => { if(m.medida) diameters.add(m.medida); });
        return Array.from(diameters).sort();
    }, [materials]);

    const generatePdf = async () => {
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
            doc.text("Reporte Avanzado de Inventario", 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');

            let currentY = 45;

            // Header info
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generado el: ${format(new Date(), 'Pp', {locale: es})}`, 14, currentY);
            currentY += 10;

            if (includeKPIs) {
                doc.setFontSize(12);
                doc.setTextColor(40);
                doc.setFont('helvetica', 'bold');
                doc.text("Resumen Ejecutivo", 14, currentY);
                currentY += 8;

                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Métrica', 'Valor']],
                    body: [
                        ['Total de ítems filtrados', kpis.total.toString()],
                        ['Operatividad (En Servicio)', kpis.servicePercent],
                        ['Salud Física (En Buen Estado)', kpis.goodConditionPercent],
                    ],
                    theme: 'grid',
                    headStyles: { fillColor: '#6c757d' },
                });
                currentY = (doc as any).lastAutoTable.finalY + 12;
            }

            if (includeInventoryDetails && filteredMaterials.length > 0) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("Detalle de Equipamiento", 14, currentY);
                currentY += 8;

                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Código', 'Nombre', 'Medida', 'Ubicación', 'Estado', 'Condición']],
                    body: filteredMaterials.map(item => [
                        item.codigo,
                        item.nombre,
                        item.medida || '-',
                        item.ubicacion.type === 'deposito' ? `Depósito ${item.cuartel}` : `Móvil ${item.vehiculo?.numeroMovil} (B: ${item.ubicacion.baulera})`,
                        item.estado,
                        item.condicion,
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: '#333333' },
                    styles: { fontSize: 8 }
                });
            }
            
            doc.save(`reporte-avanzado-inventario-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({ title: "Error al generar PDF", description: "Hubo un problema al crear el archivo PDF.", variant: "destructive" });
        } finally {
            setGeneratingPdf(false);
        }
    };

    return (
        <>
            <PageHeader title="Reportes Avanzados" description="Análisis detallado y jerárquico del inventario de materiales."/>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KpiCard title="Total Ítems" value={kpis.total} icon={Package} description="Materiales filtrados" />
                <KpiCard title="Operatividad" value={kpis.servicePercent} icon={Shield} description={`${kpis.inService} en servicio`} colorClass={parseFloat(kpis.servicePercent) < 80 ? 'border-red-200' : 'border-green-200'} />
                <KpiCard title="Buen Estado" value={kpis.goodConditionPercent} icon={HeartPulse} description={`${kpis.goodCondition} sin daños`} />
                <KpiCard title="Uso en Móviles" value={filteredMaterials.filter(m => m.ubicacion.type === 'vehiculo').length} icon={Truck} description="Equipamiento en dotación" />
            </div>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="font-headline">Filtros Inteligentes</CardTitle>
                    <CardDescription>Combina múltiples criterios para un filtrado ultra-específico.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label>Tipos de Material</Label>
                        <MultiSelectFilter 
                            title="Tipos" 
                            options={materialTypes.map(t => ({ value: t, label: t }))} 
                            selected={filterTypes} 
                            onSelectedChange={setFilterTypes} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Cuarteles</Label>
                        <MultiSelectFilter 
                            title="Cuarteles" 
                            options={firehouses.map(fh => ({ value: fh, label: fh }))} 
                            selected={filterFirehouses} 
                            onSelectedChange={setFilterFirehouses} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Especialidades</Label>
                        <MultiSelectFilter 
                            title="Especialidades" 
                            options={specializations.map(s => ({ value: s, label: s }))} 
                            selected={filterSpecializations} 
                            onSelectedChange={setFilterSpecializations} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Móviles</Label>
                        <MultiSelectFilter 
                            title="Móviles" 
                            options={vehicles.map(v => ({ value: v.id, label: `Móvil ${v.numeroMovil}` }))} 
                            selected={filterVehicles} 
                            onSelectedChange={setFilterVehicles} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Diámetros / Medidas</Label>
                        <MultiSelectFilter 
                            title="Medidas" 
                            options={availableDiameters.map(d => ({ value: d, label: d }))} 
                            selected={filterDiameters} 
                            onSelectedChange={setFilterDiameters} 
                            renderBadge={(v) => <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20" key={v}>{v}</Badge>}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Estado Operativo</Label>
                        <MultiSelectFilter 
                            title="Estados" 
                            options={['En Servicio', 'Fuera de Servicio'].map(s => ({ value: s, label: s }))} 
                            selected={filterStates} 
                            onSelectedChange={setFilterStates} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Condición Física</Label>
                        <MultiSelectFilter 
                            title="Condiciones" 
                            options={['Bueno', 'Regular', 'Malo'].map(c => ({ value: c, label: c }))} 
                            selected={filterConditions} 
                            onSelectedChange={setFilterConditions} 
                        />
                    </div>
                    <div className="flex items-end pb-1">
                        <Button variant="ghost" onClick={() => {
                            setFilterTypes([]); setFilterFirehouses([]); setFilterSpecializations([]); 
                            setFilterVehicles([]); setFilterDiameters([]); setFilterStates([]); setFilterConditions([]);
                        }} className="text-xs h-8">Limpiar todos los filtros</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Detalle del Inventario Filtrado</CardTitle>
                    <CardDescription>Mostrando {filteredMaterials.length} materiales que cumplen con los criterios.</CardDescription>
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
                                    <TableHead>Condición</TableHead>
                                    <TableHead><span className="sr-only">Acciones</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                    ))
                                ) : filteredMaterials.length > 0 ? (
                                    filteredMaterials.map(material => (
                                        <TableRow key={material.id}>
                                            <TableCell className="font-mono text-xs">{material.codigo}</TableCell>
                                            <TableCell className="font-medium">{material.nombre}</TableCell>
                                            <TableCell>{material.medida ? <span className="font-bold text-primary">{material.medida}</span> : '-'}</TableCell>
                                            <TableCell className="text-xs">
                                                {material.ubicacion.type === 'vehiculo' 
                                                    ? `Móvil ${material.vehiculo?.numeroMovil} (B:${material.ubicacion.baulera})`
                                                    : `Depósito ${material.cuartel}`
                                                }
                                            </TableCell>
                                            <TableCell><Badge variant={material.estado === 'En Servicio' ? 'default' : 'destructive'} className={cn("text-[10px]", material.estado === 'En Servicio' ? 'bg-green-600' : '')}>{material.estado}</Badge></TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn(
                                                    "text-[10px]",
                                                    material.condicion === 'Bueno' ? 'text-green-600 border-green-200' : 
                                                    material.condicion === 'Regular' ? 'text-yellow-600 border-yellow-200' : 'text-red-600 border-red-200'
                                                )}>{material.condicion}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <EditMaterialDialog material={material} onMaterialUpdated={handleDataChange}>
                                                            <DropdownMenuItem onSelect={e => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                                                        </EditMaterialDialog>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem className="text-destructive" onSelect={e => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>¿Eliminar material?</AlertDialogTitle>
                                                                    <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDelete(material.id)} variant="destructive">Eliminar</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={7} className="h-24 text-center">No se encontraron materiales.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="font-headline">Exportar Reporte Estratégico</CardTitle>
                    <CardDescription>Genere un archivo PDF detallado con el análisis de los datos filtrados.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <Switch id="include-kpis" checked={includeKPIs} onCheckedChange={setIncludeKPIs} />
                            <Label htmlFor="include-kpis">Incluir Resumen Ejecutivo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="include-details" checked={includeInventoryDetails} onCheckedChange={setIncludeInventoryDetails} />
                            <Label htmlFor="include-details">Incluir Detalle Técnico</Label>
                        </div>
                    </div>
                    <Button onClick={generatePdf} disabled={generatingPdf || filteredMaterials.length === 0} className="w-full sm:w-auto">
                        {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {generatingPdf ? "Generando Reporte..." : "Descargar Reporte PDF"}
                    </Button>
                </CardContent>
            </Card>
        </>
    );
}
