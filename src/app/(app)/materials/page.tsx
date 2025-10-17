
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, QrCode } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Material, Specialization, Vehicle } from "@/lib/types";
import { getMaterials, deleteMaterial } from "@/services/materials.service";
import { getVehicles } from "@/services/vehicles.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import AddMaterialDialog from "./_components/add-material-dialog";
import EditMaterialDialog from "./_components/edit-material-dialog";
import QrScannerDialog from "./_components/qr-scanner-dialog";
import MaterialDetailDialog from "./_components/material-detail-dialog";
import { Progress } from "@/components/ui/progress";


const materialTypes: Material['tipo'][] = ['Lanza', 'Manga', 'Corte', 'Combustion', 'Hidraulica', 'Golpe'];
const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE', 'VARIOS'];
const firehouses: Material['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

export default function MaterialsPage() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterFirehouse, setFilterFirehouse] = useState('all');
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterVehicle, setFilterVehicle] = useState('all');
    const [scannedMaterial, setScannedMaterial] = useState<Material | null>(null);

    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Encargado', [activeRole]);

    const fetchMaterialsAndVehicles = async () => {
        setLoading(true);
        try {
            const [materialsData, vehiclesData] = await Promise.all([
                getMaterials(),
                getVehicles()
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
        fetchMaterialsAndVehicles();
    }, [toast]);

    const handleDataChange = () => {
        fetchMaterialsAndVehicles();
    };

    const handleDelete = async (materialId: string) => {
        try {
            await deleteMaterial(materialId);
            toast({ title: "¡Éxito!", description: "El material ha sido eliminado." });
            fetchMaterialsAndVehicles();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo eliminar el material.", variant: "destructive" });
        }
    };

    const handleQrScan = (code: string) => {
        const foundMaterial = materials.find(m => m.codigo.toLowerCase() === code.toLowerCase());
        if (foundMaterial) {
            setScannedMaterial(foundMaterial);
        } else {
            toast({
                variant: "destructive",
                title: "Material no encontrado",
                description: `No se encontró ningún material con el código: ${code}`,
            });
        }
    };
    
    const filteredMaterials = useMemo(() => {
        return materials.filter(material => {
            if (searchTerm && !(material.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || material.codigo.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
            if (filterType !== 'all' && material.tipo !== filterType) return false;
            if (filterFirehouse !== 'all' && material.cuartel !== filterFirehouse) return false;
            if (filterSpecialization !== 'all' && material.especialidad !== filterSpecialization) return false;
            if (filterVehicle !== 'all' && material.ubicacion?.vehiculoId !== filterVehicle) return false;
            return true;
        });
    }, [materials, searchTerm, filterType, filterFirehouse, filterSpecialization, filterVehicle]);
    
    const statistics = useMemo(() => {
        const total = filteredMaterials.length;
        if (total === 0) {
            return {
                byCondition: { Bueno: 0, Regular: 0, Malo: 0 },
                byType: {}
            };
        }

        const byCondition = filteredMaterials.reduce((acc, mat) => {
            acc[mat.condicion] = (acc[mat.condicion] || 0) + 1;
            return acc;
        }, {} as Record<Material['condicion'], number>);

        const byType = filteredMaterials.reduce((acc, mat) => {
            acc[mat.tipo] = (acc[mat.tipo] || 0) + 1;
            return acc;
        }, {} as Record<Material['tipo'], number>);

        return { byCondition, byType };
    }, [filteredMaterials]);


    const renderLocation = (material: Material) => {
        if (material.ubicacion.type === 'vehiculo') {
            return `Móvil ${material.vehiculo?.numeroMovil || '?'} (B: ${material.ubicacion.baulera})`;
        }
        return material.ubicacion.deposito;
    };
    
    return (
        <>
            <PageHeader title="Gestión de Materiales" description="Inventario de materiales y equipos del cuartel.">
                {canManage && (
                    <AddMaterialDialog onMaterialAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Material
                        </Button>
                    </AddMaterialDialog>
                )}
            </PageHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Búsqueda y Filtros</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                             <div className="space-y-2 md:col-span-3">
                                <Label htmlFor="search-term">Buscar por Nombre o Código</Label>
                                <Input id="search-term" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Filtrar por Tipo</Label>
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los Tipos</SelectItem>
                                        {materialTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Filtrar por Cuartel</Label>
                                <Select value={filterFirehouse} onValueChange={setFilterFirehouse}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los Cuarteles</SelectItem>
                                        {firehouses.map(fh => <SelectItem key={fh} value={fh}>{fh}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Filtrar por Especialidad</Label>
                                <Select value={filterSpecialization} onValueChange={setFilterSpecialization}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2 sm:col-span-2 md:col-span-1">
                                <Label>Filtrar por Móvil</Label>
                                <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.numeroMovil} - {v.marca}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2 sm:col-span-2 md:col-span-2 flex items-end">
                                <QrScannerDialog onScan={handleQrScan}>
                                    <Button size="lg" variant="outline" className="w-full">
                                        <QrCode className="mr-2 h-6 w-6"/>
                                        Escanear Código QR
                                    </Button>
                                </QrScannerDialog>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Inventario General</CardTitle>
                            <CardDescription>
                                Mostrando {filteredMaterials.length} de {materials.length} materiales.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Ubicación</TableHead>
                                        <TableHead>Estado</TableHead>
                                        {canManage && <TableHead><span className="sr-only">Acciones</span></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}><TableCell colSpan={canManage ? 5 : 4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                        ))
                                    ) : filteredMaterials.length > 0 ? (
                                        filteredMaterials.map(material => (
                                            <TableRow key={material.id}>
                                                <TableCell className="font-mono">{material.codigo}</TableCell>
                                                <TableCell className="font-medium">{material.nombre}</TableCell>
                                                <TableCell>{renderLocation(material)}</TableCell>
                                                <TableCell><Badge variant={material.estado === 'En Servicio' ? 'default' : 'destructive'} className={material.estado === 'En Servicio' ? 'bg-green-600' : ''}>{material.estado}</Badge></TableCell>
                                                {canManage && (
                                                    <TableCell>
                                                        <AlertDialog><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuLabel>Acciones</DropdownMenuLabel><EditMaterialDialog material={material} onMaterialUpdated={handleDataChange}><DropdownMenuItem onSelect={(e) => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem></EditMaterialDialog><DropdownMenuSeparator /><AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem></AlertDialogTrigger></DropdownMenuContent></DropdownMenu><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Está seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente el material "{material.nombre}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(material.id)} variant="destructive">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={canManage ? 5 : 4} className="h-24 text-center">No se encontraron materiales con los filtros aplicados.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Estadísticas</CardTitle>
                            <CardDescription>Resumen de los materiales filtrados.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h4 className="font-semibold mb-3">Estado de Condición</h4>
                                <div className="space-y-2">
                                     {(['Bueno', 'Regular', 'Malo'] as const).map(cond => {
                                        const count = statistics.byCondition?.[cond] || 0;
                                        const percentage = filteredMaterials.length > 0 ? (count / filteredMaterials.length) * 100 : 0;
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
                            <div className="pt-6 border-t">
                                 <h4 className="font-semibold mb-3">Conteo por Tipo</h4>
                                 <div className="space-y-2 text-sm">
                                    {Object.entries(statistics.byType || {}).sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => (
                                        <div key={type} className="flex justify-between p-2 rounded-md even:bg-muted/50">
                                            <span>{type}</span>
                                            <span className="font-bold">{count}</span>
                                        </div>
                                    ))}
                                    {Object.keys(statistics.byType || {}).length === 0 && <p className="text-muted-foreground text-center">Sin datos</p>}
                                 </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            <MaterialDetailDialog
                material={scannedMaterial}
                open={!!scannedMaterial}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setScannedMaterial(null);
                    }
                }}
            />
        </>
    );
}
