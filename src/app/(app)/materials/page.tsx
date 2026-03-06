'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, QrCode, Upload, AlertCircle } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Material, Vehicle } from "@/lib/types";
import { getMaterials, deleteMaterial } from "@/services/materials.service";
import { getVehicles } from "@/services/vehicles.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import AddMaterialDialog from "./_components/add-material-dialog";
import EditMaterialDialog from "./_components/edit-material-dialog";
import QrScannerDialog from "./_components/qr-scanner-dialog";
import MaterialDetailDialog from "./_components/material-detail-dialog";
import ImportMaterialsDialog from "./_components/import-materials-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";


export default function MaterialsPage() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailItem, setDetailItem] = useState<Material | null>(null);
    
    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);

    const isPrivileged = activeRole === 'Master' || activeRole === 'Administrador';
    const isEncargado = activeRole === 'Encargado';
    
    const managedVehicleIds = useMemo(() => {
        if (!user || !isEncargado) return new Set<string>();
        return new Set(vehicles.filter(v => v.materialEncargadoIds?.includes(user.id)).map(v => v.id));
    }, [user, vehicles, isEncargado]);

    const canAdd = isPrivileged || (isEncargado && managedVehicleIds.size > 0);

    const fetchAllData = async () => {
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
        fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDataChange = () => {
        fetchAllData();
    };

    const handleDelete = async (materialId: string) => {
        if (!user) return;
        try {
            await deleteMaterial(materialId, user);
            toast({ title: "Material eliminado" });
            fetchAllData();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    }

    const handleSearch = (code: string) => {
        if (!code) {
            setDetailItem(null);
            return;
        }
        const exactCodeMatch = materials.find(item => item.codigo.toLowerCase() === code.toLowerCase());
        if (exactCodeMatch) {
            setDetailItem(exactCodeMatch);
        } else {
            setDetailItem(null);
            toast({
                variant: "destructive",
                title: "Material no encontrado",
                description: `No se encontró el material con el código: ${code}.`,
            });
        }
    };
    
    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleSearch(searchTerm);
    }
    
    const handleQrScan = (code: string) => {
        setSearchTerm(code);
        handleSearch(code);
    };

    const canEditMaterial = (m: Material) => {
        if (isPrivileged) return true;
        if (isEncargado && m.ubicacion.type === 'vehiculo' && m.ubicacion.vehiculoId && managedVehicleIds.has(m.ubicacion.vehiculoId)) {
            return true;
        }
        return false;
    }

    const canDeleteMaterial = (m: Material) => {
        return isPrivileged;
    }

    if (activeRole === 'Bombero' || activeRole === 'Oficial') {
        return (
            <>
                <PageHeader title="Inventario de Materiales" description="Consulta rápida de equipamiento."/>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Búsqueda de Material</CardTitle>
                            <CardDescription>
                            Ingrese un código para buscar, o use el escáner QR.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                            <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-grow">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="search-term-minimal"
                                        placeholder="Buscar por código..." 
                                        className="pl-9" 
                                        value={searchTerm} 
                                        onChange={(e) => setSearchTerm(e.target.value)} 
                                    />
                                </div>
                                <QrScannerDialog onScan={handleQrScan}>
                                    <Button variant="outline" type="button" className="w-full sm:w-auto">
                                        <QrCode className="mr-2 h-4 w-4" />
                                        Escanear QR
                                    </Button>
                                </QrScannerDialog>
                                <Button type="submit" className="w-full sm:w-auto">Buscar</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
                <MaterialDetailDialog
                    material={detailItem}
                    open={!!detailItem}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) setDetailItem(null);
                    }}
                />
            </>
        )
    }

    return (
        <>
            <PageHeader title="Inventario de Materiales" description="Busque, filtre y gestione el inventario de materiales y equipos.">
                <div className='flex flex-col sm:flex-row gap-2'>
                    {isPrivileged && (
                        <ImportMaterialsDialog onImportSuccess={handleDataChange}>
                             <Button variant="outline" className="w-full">
                                <Upload className="mr-2 h-4 w-4" />
                                Importar CSV
                            </Button>
                        </ImportMaterialsDialog>
                    )}
                    {canAdd && (
                        <AddMaterialDialog onMaterialAdded={handleDataChange}>
                            <Button className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Agregar Material
                            </Button>
                        </AddMaterialDialog>
                    )}
                </div>
            </PageHeader>
            
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Búsqueda de Material</CardTitle>
                        <CardDescription>
                        Ingrese un código para buscar, o use el escáner QR.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-grow">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="search-term"
                                    placeholder="Buscar por código..." 
                                    className="pl-9" 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                />
                            </div>
                            <QrScannerDialog onScan={handleQrScan}>
                                <Button variant="outline" type="button" className="w-full sm:w-auto">
                                    <QrCode className="mr-2 h-4 w-4" />
                                    Escanear QR
                                </Button>
                            </QrScannerDialog>
                            <Button type="submit" className="w-full sm:w-auto">Buscar</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="text-lg font-headline">Equipamiento Reciente</CardTitle>
                    <CardDescription>Listado de materiales. Los equipos sin clasificar aparecen resaltados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Ubicación</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                ))
                            ) : materials.length > 0 ? (
                                materials.slice(0, 50).map(m => (
                                <TableRow key={m.id}>
                                    <TableCell>
                                        {m.codigo ? (
                                            <span className="font-mono font-bold text-xs">{m.codigo}</span>
                                        ) : (
                                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] flex items-center gap-1 w-fit">
                                                <AlertCircle className="h-3 w-3" /> Pendiente
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium text-sm">
                                        {m.nombre}
                                        {m.marca && <span className="block text-[10px] text-muted-foreground">{m.marca} {m.modelo}</span>}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {m.ubicacion.type === 'vehiculo' ? `Móvil ${m.vehiculo?.numeroMovil || '?'}` : `Depósito ${m.cuartel}`}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={m.estado === 'En Servicio' ? 'default' : 'destructive'} className={cn("text-[10px]", m.estado === 'En Servicio' ? 'bg-green-600' : '')}>
                                            {m.estado}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <AlertDialog>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => setDetailItem(m)}>Ver Detalles</DropdownMenuItem>
                                                    {canEditMaterial(m) && (
                                                        <EditMaterialDialog material={m} onMaterialUpdated={handleDataChange}>
                                                            <DropdownMenuItem onSelect={e => e.preventDefault()}>
                                                                <Edit className="mr-2 h-4 w-4"/> Editar
                                                            </DropdownMenuItem>
                                                        </EditMaterialDialog>
                                                    )}
                                                    {canDeleteMaterial(m) && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={e => e.preventDefault()}>
                                                                    <Trash2 className="mr-2 h-4 w-4"/> Eliminar
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                                    <AlertDialogDescription>Esta acción eliminará el material "{m.nombre}" permanentemente de la base de datos.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(m.id)} variant="destructive">Eliminar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No se encontraron materiales.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            <MaterialDetailDialog
                material={detailItem}
                open={!!detailItem}
                onOpenChange={(isOpen) => {
                    if (!isOpen) setDetailItem(null);
                }}
            />
        </>
    );
}
