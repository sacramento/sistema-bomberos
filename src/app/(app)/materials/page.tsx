
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, QrCode, Upload, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, ClipboardList, Filter, LayoutList } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Material, Vehicle, Firefighter, MaterialRequest } from "@/lib/types";
import { getMaterials, deleteMaterial } from "@/services/materials.service";
import { getVehicles } from "@/services/vehicles.service";
import { getFirefighters } from "@/services/firefighters.service";
import { createMaterialRequest } from "@/services/material-requests.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import AddMaterialDialog from "./_components/add-material-dialog";
import EditMaterialDialog from "./_components/edit-material-dialog";
import QrScannerDialog from "./_components/qr-scanner-dialog";
import MaterialDetailDialog from "./_components/material-detail-dialog";
import ImportMaterialsDialog from "./_components/import-materials-dialog";
import MaterialRequestsList from "./_components/material-requests-list";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function MaterialsPage() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailItem, setDetailItem] = useState<Material | null>(null);
    const [activeTab, setActiveTab] = useState('inventory');
    const router = useRouter();
    
    // Sorting state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>({ key: 'codigo', direction: 'ascending' });

    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);

    const isPrivileged = activeRole === 'Master' || activeRole === 'Administrador';
    const isEncargado = activeRole === 'Encargado';
    
    const loggedInFirefighter = useMemo(() => {
        if (!user || firefighters.length === 0) return null;
        return firefighters.find(f => f.legajo === user.id);
    }, [user, firefighters]);

    const managedVehicleIds = useMemo(() => {
        if (!loggedInFirefighter || !isEncargado) return new Set<string>();
        return new Set(vehicles.filter(v => v.materialEncargadoIds?.includes(loggedInFirefighter.id)).map(v => v.id));
    }, [loggedInFirefighter, vehicles, isEncargado]);

    const canAdd = isPrivileged || (isEncargado && managedVehicleIds.size > 0);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [materialsData, vehiclesData, firefightersData] = await Promise.all([
                getMaterials(),
                getVehicles(),
                getFirefighters()
            ]);
            setMaterials(materialsData);
            setVehicles(vehiclesData);
            setFirefighters(firefightersData);
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

    const handleDelete = async (m: Material) => {
        if (!user) return;
        
        if (isPrivileged) {
            try {
                await deleteMaterial(m.id, user);
                toast({ title: "Material eliminado" });
                fetchAllData();
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
                    data: {}
                });
                toast({ title: "Solicitud de baja enviada", description: "Un administrador debe autorizar la eliminación de este equipo." });
            } catch (error: any) {
                toast({ variant: "destructive", title: "Error", description: error.message });
            }
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
        if (isPrivileged) return true;
        if (isEncargado && m.ubicacion.type === 'vehiculo' && m.ubicacion.vehiculoId && managedVehicleIds.has(m.ubicacion.vehiculoId)) {
            return true;
        }
        return false;
    }

    // Sorting Logic
    const sortedMaterials = useMemo(() => {
        let sortableItems = [...materials];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof Material];
                let bValue: any = b[sortConfig.key as keyof Material];

                // Custom logic for Location
                if (sortConfig.key === 'ubicacion') {
                    const getLocString = (m: Material) => m.ubicacion.type === 'vehiculo' 
                        ? `V-${m.vehiculo?.numeroMovil?.padStart(3, '0') || '999'}-${m.ubicacion.baulera}`
                        : `D-${m.cuartel}`;
                    aValue = getLocString(a);
                    bValue = getLocString(b);
                }

                // Handle string sorting (case insensitive)
                if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                if (typeof bValue === 'string') bValue = bValue.toLowerCase();

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [materials, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
        return sortConfig.direction === 'ascending' 
            ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> 
            : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
    };

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
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className={cn("grid w-full mb-6", isPrivileged ? "grid-cols-4 max-w-2xl mx-auto" : "grid-cols-3 max-w-md mx-auto")}>
                    <TabsTrigger value="search">Búsqueda</TabsTrigger>
                    <TabsTrigger value="inventory">Inventario</TabsTrigger>
                    <TabsTrigger value="reports">Informes</TabsTrigger>
                    {isPrivileged && <TabsTrigger value="requests" className="relative">
                        Solicitudes
                        <Badge className="absolute -top-2 -right-2 bg-red-600">!</Badge>
                    </TabsTrigger>}
                </TabsList>

                <TabsContent value="search" className="space-y-6">
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
                </TabsContent>

                <TabsContent value="inventory">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-headline">Equipamiento</CardTitle>
                            <CardDescription>Listado de materiales. Haga clic en los encabezados para ordenar.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('codigo')}>
                                            <div className="flex items-center">Código {getSortIcon('codigo')}</div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('nombre')}>
                                            <div className="flex items-center">Nombre {getSortIcon('nombre')}</div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('ubicacion')}>
                                            <div className="flex items-center">Ubicación {getSortIcon('ubicacion')}</div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('estado')}>
                                            <div className="flex items-center">Estado {getSortIcon('estado')}</div>
                                        </TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                        ))
                                    ) : sortedMaterials.length > 0 ? (
                                        sortedMaterials.map(m => (
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
                                                            <AlertDialogDescription>
                                                                {isPrivileged 
                                                                    ? `Esta acción eliminará el material "${m.nombre}" permanentemente.` 
                                                                    : `Como encargado, se enviará una solicitud de baja para el material "${m.nombre}" al administrador.`}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(m)} variant="destructive">
                                                                {isPrivileged ? "Eliminar" : "Enviar Solicitud"}
                                                            </AlertDialogAction>
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
                </TabsContent>

                <TabsContent value="reports">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Reportes Técnicos</CardTitle>
                            <CardDescription>Acceda a los filtros avanzados y exportación de inventarios precisos.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center py-10">
                            <Button size="lg" onClick={() => router.push('/materials-reports')}>
                                Abrir Panel de Informes <ArrowRight className="ml-2 h-5 w-5"/>
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {isPrivileged && (
                    <TabsContent value="requests">
                        <MaterialRequestsList onDataChange={handleDataChange} actor={user}/>
                    </TabsContent>
                )}
            </Tabs>
            
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
