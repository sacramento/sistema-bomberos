
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, QrCode, Upload, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Filter, ArrowRight, Users } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Material, Vehicle, Firefighter } from "@/lib/types";
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
import MaterialLeadsManager from "./_components/material-leads-manager";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function MaterialsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();

    const [materials, setMaterials] = useState<Material[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailItem, setDetailItem] = useState<Material | null>(null);
    const [activeTab, setActiveTab] = useState('inventory');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>({ key: 'codigo', direction: 'ascending' });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const activeRole = getActiveRole(pathname);
    const isPrivileged = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);
    const isEncargado = useMemo(() => activeRole === 'Encargado', [activeRole]);
    const isConsultant = activeRole === 'Bombero' || activeRole === 'Oficial';
    
    const loggedInFirefighter = useMemo(() => {
        if (!user || firefighters.length === 0) return null;
        return firefighters.find(f => f.legajo === user.id);
    }, [user, firefighters]);

    const managedVehicleIds = useMemo(() => {
        if (!loggedInFirefighter || !isEncargado) return new Set<string>();
        return new Set(vehicles.filter(v => v.materialEncargadoIds?.includes(loggedInFirefighter.id)).map(v => v.id));
    }, [loggedInFirefighter, vehicles, isEncargado]);

    const canAdd = useMemo(() => isPrivileged || (isEncargado && managedVehicleIds.size > 0), [isPrivileged, isEncargado, managedVehicleIds]);

    const fetchData = async () => {
        if (!user) return;
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
             toast({ title: "Error", description: "Fallo al cargar inventario.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        if (isMounted && user) {
            fetchData();
        }
    }, [isMounted, user]);

    const handleDataChange = () => {
        fetchData();
    };

    const handleDelete = async (m: Material) => {
        if (!user) return;
        if (isPrivileged) {
            try {
                await deleteMaterial(m.id, user);
                toast({ title: "Material eliminado" });
                fetchData();
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
                toast({ title: "Solicitud de baja enviada" });
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
                description: `Código: ${code}`,
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

    const sortedMaterials = useMemo(() => {
        let sortableItems = [...materials];
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
    }, [materials, sortConfig]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return sortedMaterials;
        return sortedMaterials.filter(i => 
            i.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || 
            i.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sortedMaterials, searchTerm]);

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

    if (!isMounted) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

    if (isConsultant) {
        return (
            <>
                <PageHeader title="Inventario de Materiales" description="Consulta rápida de equipamiento."/>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Búsqueda de Material</CardTitle>
                        <CardDescription>Ingrese un código o escanee QR.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-grow">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Código..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                                <QrScannerDialog onScan={handleQrScan}>
                                    <Button variant="outline" type="button" className="w-full sm:w-auto"><QrCode className="mr-2 h-4 w-4" /> Escanear QR</Button>
                                </QrScannerDialog>
                                <Button type="submit" className="w-full sm:w-auto">Buscar</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
                <MaterialDetailDialog material={detailItem} open={!!detailItem} onOpenChange={(isOpen) => { if (!isOpen) setDetailItem(null); }} />
            </>
        )
    }

    return (
        <>
            <PageHeader title="Inventario de Materiales" description="Gestión operativa de equipos.">
                <div className='flex flex-col sm:flex-row gap-2'>
                    {isPrivileged && <ImportMaterialsDialog onImportSuccess={handleDataChange}><Button variant="outline" className="w-full"><Upload className="mr-2 h-4 w-4" /> Importar CSV</Button></ImportMaterialsDialog>}
                    {canAdd && <AddMaterialDialog onMaterialAdded={handleDataChange}><Button className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Agregar Material</Button></AddMaterialDialog>}
                </div>
            </PageHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className={cn("grid w-full mb-6", isPrivileged ? "grid-cols-5 max-w-3xl mx-auto" : "grid-cols-3 max-w-md mx-auto")}>
                    <TabsTrigger value="search">Búsqueda</TabsTrigger>
                    <TabsTrigger value="inventory">Inventario</TabsTrigger>
                    <TabsTrigger value="reports">Informes</TabsTrigger>
                    {isPrivileged && <TabsTrigger value="leads"><Users className="h-4 w-4 mr-2" /> Encargados</TabsTrigger>}
                    {isPrivileged && <TabsTrigger value="requests" className="relative">Solicitudes <Badge className="absolute -top-2 -right-2 bg-red-600">!</Badge></TabsTrigger>}
                </TabsList>
                
                <TabsContent value="search">
                    <Card><CardHeader><CardTitle className="font-headline">Búsqueda</CardTitle></CardHeader><CardContent><form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-4"><div className="relative flex-grow"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Código o nombre..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div><QrScannerDialog onScan={handleQrScan}><Button variant="outline" type="button"><QrCode className="mr-2 h-4 w-4" /> Escanear</Button></QrScannerDialog><Button type="submit">Buscar</Button></form></CardContent></Card>
                </TabsContent>
                
                <TabsContent value="inventory">
                    <Card><CardHeader><CardTitle className="text-lg font-headline">Equipamiento</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="cursor-pointer" onClick={() => requestSort('codigo')}>Código {getSortIcon('codigo')}</TableHead><TableHead className="cursor-pointer" onClick={() => requestSort('nombre')}>Nombre {getSortIcon('nombre')}</TableHead><TableHead className="cursor-pointer" onClick={() => requestSort('ubicacion')}>Ubicación {getSortIcon('ubicacion')}</TableHead><TableHead className="cursor-pointer" onClick={() => requestSort('estado')}>Estado {getSortIcon('estado')}</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-10 w-full"/></TableCell></TableRow> : filteredItems.map(m => (<TableRow key={m.id}><TableCell className="font-mono text-xs font-bold">{m.codigo || 'S/C'}</TableCell><TableCell className="text-sm">{m.nombre}</TableCell><TableCell className="text-xs">{m.ubicacion.type === 'vehiculo' ? `Móvil ${m.vehiculo?.numeroMovil || '?'}` : `Dep. ${m.cuartel}`}</TableCell><TableCell><Badge variant={m.estado === 'En Servicio' ? 'default' : 'destructive'} className="text-[10px]">{m.estado}</Badge></TableCell><TableCell className="text-right"><AlertDialog><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setDetailItem(m)}>Ver Detalles</DropdownMenuItem>{canEditMaterial(m) && <EditMaterialDialog material={m} onMaterialUpdated={handleDataChange}><DropdownMenuItem onSelect={e => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/> Editar</DropdownMenuItem></EditMaterialDialog>}{canDeleteMaterial(m) && <><DropdownMenuSeparator /><AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Eliminar</DropdownMenuItem></AlertDialogTrigger></>}</DropdownMenuContent></DropdownMenu><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>{isPrivileged ? "Eliminar permanentemente." : "Enviar solicitud de baja."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(m)} variant="destructive">{isPrivileged ? "Eliminar" : "Enviar Solicitud"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
                </TabsContent>
                
                <TabsContent value="reports">
                    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Reportes</CardTitle></CardHeader><CardContent className="flex justify-center py-10"><Button size="lg" onClick={() => router.push('/materials-reports')}>Abrir Informes <ArrowRight className="ml-2 h-5 w-5"/></Button></CardContent></Card>
                </TabsContent>

                {isPrivileged && (
                    <TabsContent value="leads">
                        <MaterialLeadsManager actor={user} />
                    </TabsContent>
                )}

                {isPrivileged && (
                    <TabsContent value="requests">
                        <MaterialRequestsList onDataChange={handleDataChange} actor={user}/>
                    </TabsContent>
                )}
            </Tabs>
            <MaterialDetailDialog material={detailItem} open={!!detailItem} onOpenChange={(isOpen) => { if (!isOpen) setDetailItem(null); }} />
        </>
    );
}
