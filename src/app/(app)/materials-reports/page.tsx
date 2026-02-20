
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, Edit, Download, Loader2 } from "lucide-react";
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


const materialTypes: Material['tipo'][] = [
    'COMUNICACION', 'DOCUMENTACION', 'H. CORTE', 'H. ELECTRICA', 'H. GOLPE', 
    'H. HIDRAULICA', 'H. NEUMATICA', 'ILUMINACION', 'INSTRUMENTO', 'LANZA', 
    'LOGISTICA', 'MANGA', 'MEDICO', 'PROTECCION', 'RESPIRACION'
];
const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE VEHICULAR', 'RESCATE URBANO', 'VARIOS'];
const firehouses: Material['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

export default function MaterialsReportPage() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [allFirefighters, setAllFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [filterFirehouse, setFilterFirehouse] = useState('all');
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterVehicle, setFilterVehicle] = useState('all');
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    
    // State for deletion
    const [deleteTarget, setDeleteTarget] = useState('all'); // 'all' or vehicle.id
    const [confirmationText, setConfirmationText] = useState('');


    const [includeConditionSummary, setIncludeConditionSummary] = useState(true);
    const [includeTypeSummary, setIncludeTypeSummary] = useState(true);
    const [includeInventoryDetails, setIncludeInventoryDetails] = useState(true);

    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();

    const activeRole = getActiveRole(pathname);

    const canManageGlobally = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

    const loggedInFirefighter = useMemo(() => {
        if (!user) return null;
        return allFirefighters.find(f => f.id === user.id);
    }, [user, allFirefighters]);
    
    const canManageMaterial = (material: Material) => {
        if (canManageGlobally) return true;
        if (activeRole === 'Encargado' && loggedInFirefighter) {
            return material.cuartel === loggedInFirefighter.firehouse;
        }
        return false;
    }

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
                reader.onloadend = () => {
                    setLogoDataUrl(reader.result as string);
                };
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
            toast({ title: "Error", description: error.message || "No se pudo eliminar el material.", variant: "destructive" });
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

    const generatePdf = async () => {
        if (!logoDataUrl) {
            toast({ title: "Espere un momento", description: "El logo para el PDF aún se está cargando.", variant: "destructive" });
            return;
        }

        if (!includeConditionSummary && !includeTypeSummary && !includeInventoryDetails) {
            toast({ title: "Contenido vacío", description: "Debe seleccionar al menos una sección para incluir en el reporte.", variant: "destructive" });
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
            doc.text("Reporte de Inventario", 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');

            let currentY = 55;

            // --- Statistics Section ---
            if (includeConditionSummary) {
                doc.setFontSize(12);
                doc.setTextColor(40, 40, 40);
                doc.setFont('helvetica', 'bold');
                doc.text("Resumen por Condición", 14, currentY);
                currentY += 8;

                const conditionTotal = (statistics.byCondition?.Bueno || 0) + (statistics.byCondition?.Regular || 0) + (statistics.byCondition?.Malo || 0);
                const conditionBody = (['Bueno', 'Regular', 'Malo'] as const).map(cond => {
                    const count = statistics.byCondition?.[cond] || 0;
                    const percentage = conditionTotal > 0 ? (count / conditionTotal) * 100 : 0;
                    return [cond, count.toString(), `${percentage.toFixed(0)}%`];
                });

                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Condición', 'Cantidad', 'Porcentaje']],
                    body: conditionBody,
                    theme: 'striped',
                    headStyles: { fillColor: '#6c757d' },
                });
                currentY = (doc as any).lastAutoTable.finalY + 12;
            }

            if (includeTypeSummary) {
                 if (currentY > 250) { doc.addPage(); currentY = 20; }
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("Resumen por Tipo de Material", 14, currentY);
                currentY += 8;
                const typeBody = Object.entries(statistics.byType || {}).sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => [type, count.toString()]);
                
                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Tipo', 'Cantidad']],
                    body: typeBody,
                    theme: 'striped',
                    headStyles: { fillColor: '#6c757d' },
                });
                currentY = (doc as any).lastAutoTable.finalY + 12;
            }

            // --- Main Inventory Table ---
            if (includeInventoryDetails && generalFilteredMaterials.length > 0) {
                 if (currentY > 250) { doc.addPage(); currentY = 20; }
                doc.setFontSize(12);
                doc.setTextColor(40, 40, 40);
                doc.setFont('helvetica', 'bold');
                doc.text("Detalle del Inventario", 14, currentY);
                currentY += 8;

                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Código', 'Nombre', 'Ubicación', 'Cuartel', 'Estado', 'Condición']],
                    body: generalFilteredMaterials.map(item => [
                        item.codigo,
                        item.nombre,
                        item.ubicacion.type === 'deposito' ? `Depósito ${item.cuartel}` : `Móvil ${item.vehiculo?.numeroMovil} (B: ${item.ubicacion.baulera})`,
                        item.cuartel,
                        item.estado,
                        item.condicion,
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: '#333333' },
                });
            } else if (includeInventoryDetails) {
                 if (currentY > 250) { doc.addPage(); currentY = 20; }
                doc.text("No se encontraron materiales con los filtros aplicados para el detalle.", 14, currentY);
            }
            doc.save(`reporte-inventario-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({ title: "Error al generar PDF", description: "Hubo un problema al crear el archivo PDF.", variant: "destructive" });
        } finally {
            setGeneratingPdf(false);
        }
    };
    
    const generalFilteredMaterials = useMemo(() => {
        return materials.filter(material => {
            if (filterType !== 'all' && material.tipo !== filterType) return false;
            if (filterFirehouse !== 'all' && material.cuartel !== filterFirehouse) return false;
            if (filterSpecialization !== 'all' && material.especialidad !== filterSpecialization) return false;
            if (filterVehicle !== 'all' && material.ubicacion?.vehiculoId !== filterVehicle) return false;
            return true;
        });
    }, [materials, filterType, filterFirehouse, filterSpecialization, filterVehicle]);

    const statistics = useMemo(() => {
        const listToAnalyze = generalFilteredMaterials;
        const total = listToAnalyze.length;
        if (total === 0) {
            return {
                byCondition: { Bueno: 0, Regular: 0, Malo: 0 },
                byType: {} as Record<string, number>
            };
        }

        const byCondition = listToAnalyze.reduce((acc, mat) => {
            acc[mat.condicion] = (acc[mat.condicion] || 0) + 1;
            return acc;
        }, { Bueno: 0, Regular: 0, Malo: 0 } as Record<Material['condicion'], number>);

        const byType = listToAnalyze.reduce((acc, mat) => {
            acc[mat.tipo] = (acc[mat.tipo] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return { byCondition, byType };
    }, [generalFilteredMaterials]);

    const renderLocation = (material: Material) => {
        if (material.ubicacion.type === 'vehiculo') {
            return `Móvil ${material.vehiculo?.numeroMovil || '?'} (B: ${material.ubicacion.baulera})`;
        }
        return `Depósito ${material.ubicacion.deposito}`;
    };
    
    return (
        <>
            <PageHeader title="Reportes de Materiales" description="Filtre, analice y exporte el estado del inventario general."/>
            
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Filtros de Inventario</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {materialTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Cuartel</Label>
                                <Select value={filterFirehouse} onValueChange={setFilterFirehouse}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {firehouses.map(fh => <SelectItem key={fh} value={fh}>{fh}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Especialidad</Label>
                                <Select value={filterSpecialization} onValueChange={setFilterSpecialization}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Móvil</Label>
                                <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.numeroMovil} - {v.marca}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                    <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Estadísticas del Inventario</CardTitle>
                        <CardDescription>Resumen de los materiales según los filtros aplicados.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-3">Condición General</h4>
                            <div className="space-y-2">
                                {(['Bueno', 'Regular', 'Malo'] as const).map(cond => {
                                    const count = statistics.byCondition?.[cond] || 0;
                                    const total = (statistics.byCondition?.Bueno || 0) + (statistics.byCondition?.Regular || 0) + (statistics.byCondition?.Malo || 0);
                                    const percentage = total > 0 ? (count / total) * 100 : 0;
                                    const color = cond === 'Bueno' ? 'bg-green-500' : cond === 'Regular' ? 'bg-yellow-500' : 'bg-red-500';
                                    return (
                                        <div key={cond}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>{cond}</span>
                                                <span>{count} ({percentage.toFixed(0)}%)</span>
                                            </div>
                                            <Progress value={percentage} indicatorClassName={color} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3">Conteo por Tipo</h4>
                            <div className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2">
                                {Object.keys(statistics.byType || {}).length > 0 ? Object.entries(statistics.byType || {}).sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => (
                                    <div key={type} className="flex justify-between p-2 rounded-md even:bg-muted/50">
                                        <span>{type}</span>
                                        <span className="font-bold">{count}</span>
                                    </div>
                                )) : (
                                    <p className="text-muted-foreground text-center pt-10">Sin datos para los filtros aplicados</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Inventario Detallado</CardTitle>
                        <CardDescription>Mostrando {generalFilteredMaterials.length} de {materials.length} materiales.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Ubicación</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead><span className="sr-only">Acciones</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                        ))
                                    ) : generalFilteredMaterials.length > 0 ? (
                                        generalFilteredMaterials.map(material => (
                                            <TableRow key={material.id}>
                                                <TableCell className="font-mono">{material.codigo}</TableCell>
                                                <TableCell className="font-medium">{material.nombre}</TableCell>
                                                <TableCell>{renderLocation(material)}</TableCell>
                                                <TableCell><Badge variant={material.estado === 'En Servicio' ? 'default' : 'destructive'} className={material.estado === 'En Servicio' ? 'bg-green-600' : ''}>{material.estado}</Badge></TableCell>
                                                <TableCell>
                                                    <AlertDialog>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                {canManageMaterial(material) && <>
                                                                    <EditMaterialDialog material={material} onMaterialUpdated={handleDataChange}>
                                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                                                                    </EditMaterialDialog>
                                                                    <DropdownMenuSeparator />
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                </>}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                                                <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente el material "{material.nombre}".</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(material.id)} variant="destructive">Eliminar</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center">No se encontraron materiales con los filtros aplicados.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Exportar Reporte</CardTitle>
                        <CardDescription>Genere un archivo PDF con los resultados filtrados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="include-condition"
                                    checked={includeConditionSummary}
                                    onCheckedChange={setIncludeConditionSummary}
                                />
                                <Label htmlFor="include-condition">Incluir resumen por condición</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="include-type"
                                    checked={includeTypeSummary}
                                    onCheckedChange={setIncludeTypeSummary}
                                />
                                <Label htmlFor="include-type">Incluir resumen por tipo</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="include-details"
                                    checked={includeInventoryDetails}
                                    onCheckedChange={setIncludeInventoryDetails}
                                />
                                <Label htmlFor="include-details">Incluir detalle del inventario</Label>
                            </div>
                        </div>
                        <Button onClick={generatePdf} disabled={generatingPdf || generalFilteredMaterials.length === 0}>
                            {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            {generatingPdf ? "Generando..." : "Generar PDF"}
                        </Button>
                    </CardContent>
                </Card>
                {canManageGlobally && (
                    <Card className="border-destructive/50">
                        <CardHeader>
                            <CardTitle className="font-headline text-destructive">Zona Peligrosa</CardTitle>
                            <CardDescription>Esta acción es irreversible y eliminará materiales del inventario.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                                <div>
                                <Label htmlFor="delete-target">Seleccionar qué eliminar</Label>
                                <Select value={deleteTarget} onValueChange={setDeleteTarget}>
                                    <SelectTrigger id="delete-target">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los materiales</SelectItem>
                                        {vehicles.map(v => (
                                            <SelectItem key={v.id} value={v.id}>Solo del Móvil {v.numeroMovil}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar Materiales Seleccionados
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                        {deleteTarget === 'all' ? (
                                            <>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Se eliminarán permanentemente **TODOS** los materiales del inventario. Para confirmar, escriba "ELIMINAR TODO" en el campo de abajo.
                                                </AlertDialogDescription>
                                                <Input 
                                                    id="delete-confirm" 
                                                    type="text" 
                                                    placeholder='Escriba ELIMINAR TODO para confirmar'
                                                    value={confirmationText}
                                                    onChange={(e) => setConfirmationText(e.target.value)}
                                                />
                                            </>
                                        ) : (
                                            <AlertDialogDescription>
                                                Esta acción no se puede deshacer. Se eliminarán permanentemente todos los materiales asignados al **Móvil {vehicles.find(v => v.id === deleteTarget)?.numeroMovil}**.
                                            </AlertDialogDescription>
                                        )}
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setConfirmationText('')}>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction 
                                            onClick={handleBulkDelete} 
                                            variant="destructive"
                                            disabled={deleteTarget === 'all' && confirmationText !== 'ELIMINAR TODO'}
                                        >
                                            Confirmar Eliminación
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}
