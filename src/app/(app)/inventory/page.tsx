
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, QrCode } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { GeneralInventoryItem } from "@/lib/types";
import { getGeneralInventory, deleteGeneralInventoryItem } from "@/services/general-inventory.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import AddInventoryItemDialog from "./_components/add-inventory-item-dialog";
import EditInventoryItemDialog from "./_components/edit-inventory-item-dialog";
import QrScannerDialog from "./_components/qr-scanner-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INVENTORY_CATEGORIES } from "@/app/lib/constants/inventory-categories";

const cuarteles: GeneralInventoryItem['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3', 'Comision'];
const ubicaciones: GeneralInventoryItem['ubicacion'][] = ['Baño', 'Matera', 'Cocina', 'Roperia', 'Cadetes', 'Deposito', 'Jefatura', 'Cambiaderos', 'Patio', 'Playón', 'Guardia', 'Ayudantia'];

export default function InventoryPage() {
    const [items, setItems] = useState<GeneralInventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterCuartel, setFilterCuartel] = useState('all');
    const [filterUbicacion, setFilterUbicacion] = useState('all');
    const [activeTab, setActiveTab] = useState('inventory');


    const { toast } = useToast();
    const { getActiveRole, user } = useAuth();
    const pathname = usePathname();

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const data = await getGeneralInventory();
            setItems(data);
        } catch (error) {
             toast({ title: "Error", description: "No se pudieron cargar los ítems del inventario.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDataChange = () => {
        fetchItems();
    };

    const handleDelete = async (itemId: string) => {
        if (!user) return;
        try {
            await deleteGeneralInventoryItem(itemId, user);
            toast({ title: "¡Éxito!", description: "El ítem ha sido eliminado." });
            fetchItems();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo eliminar el ítem.", variant: "destructive" });
        }
    };

    const handleQrScan = (code: string) => {
        const foundItem = items.find(m => m.codigo.toLowerCase() === code.toLowerCase());
        if (foundItem) {
            setActiveTab('search');
            setSearchTerm(code);
        } else {
            setActiveTab('search');
            setSearchTerm(code);
            toast({
                variant: "destructive",
                title: "Ítem no encontrado",
                description: `No se encontró el ítem con el código: ${code}.`,
            });
        }
    };
    
    const generalFilteredItems = useMemo(() => {
        return items.filter(item => {
            if (filterCategory !== 'all' && item.categoryId !== filterCategory) return false;
            if (filterCuartel !== 'all' && item.cuartel !== filterCuartel) return false;
            if (filterUbicacion !== 'all' && item.ubicacion !== filterUbicacion) return false;
            return true;
        });
    }, [items, filterCategory, filterCuartel, filterUbicacion]);

    const searchFilteredItems = useMemo(() => {
        if (!searchTerm) return [];
        return items.filter(item => 
            item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
            item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.marca?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [items, searchTerm]);

    const renderItemsTable = (itemsToList: GeneralInventoryItem[], emptyMessage: string) => (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre / Marca</TableHead>
                        <TableHead>Cuartel</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Condición</TableHead>
                        {canManage && <TableHead><span className="sr-only">Acciones</span></TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={canManage ? 7 : 6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                        ))
                    ) : itemsToList.length > 0 ? (
                        itemsToList.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-mono text-xs font-bold">{item.codigo}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{item.nombre}</span>
                                        {item.marca && <span className="text-[10px] text-muted-foreground">{item.marca} {item.modelo}</span>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs">{item.cuartel}</TableCell>
                                <TableCell className="text-xs">{item.ubicacion}</TableCell>
                                <TableCell>
                                    <Badge variant={item.estado === 'En Servicio' ? 'default' : 'destructive'} className={cn("text-[10px]", item.estado === 'En Servicio' ? 'bg-green-600' : '')}>
                                        {item.estado}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs">{item.condicion}</TableCell>
                                {canManage && (
                                <TableCell className="text-right">
                                    <AlertDialog>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <EditInventoryItemDialog item={item} onItemUpdated={handleDataChange}>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                                                </EditInventoryItemDialog>
                                                <DropdownMenuSeparator />
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem>
                                                </AlertDialogTrigger>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                                <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente el ítem "{item.nombre}".</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(item.id)} variant="destructive">Eliminar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                                )}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={canManage ? 7 : 6} className="h-24 text-center text-muted-foreground italic">{emptyMessage}</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <>
            <PageHeader title="Inventario General" description="Gestione los muebles y útiles de las dependencias.">
                {canManage && (
                    <AddInventoryItemDialog onItemAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Ítem
                        </Button>
                    </AddInventoryItemDialog>
                )}
            </PageHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6">
                    <TabsTrigger value="search">Búsqueda Rápida</TabsTrigger>
                    <TabsTrigger value="inventory">Inventario Completo</TabsTrigger>
                </TabsList>
                <TabsContent value="search">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Búsqueda de Ítem</CardTitle>
                            <CardDescription>Ingrese un código, nombre o marca para buscar.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="search-term">Buscar</Label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input id="search-term" placeholder="Código, nombre o marca..." className="pl-9 h-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Acción Rápida</Label>
                                    <QrScannerDialog onScan={handleQrScan}>
                                        <Button size="lg" variant="outline" className="w-full h-12">
                                            <QrCode className="mr-2 h-5 w-5"/> Escanear QR
                                        </Button>
                                    </QrScannerDialog>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    {searchTerm && (
                         <Card className="mt-6">
                            <CardHeader>
                                <CardTitle className="font-headline text-lg">Resultados de la Búsqueda</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {renderItemsTable(searchFilteredItems, "No se encontraron ítems con ese criterio.")}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="inventory">
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="font-headline">Filtros del Inventario</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Categoría</Label>
                                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas</SelectItem>
                                            {INVENTORY_CATEGORIES.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Cuartel/Comisión</Label>
                                    <Select value={filterCuartel} onValueChange={setFilterCuartel}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            {cuarteles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Ubicación</Label>
                                    <Select value={filterUbicacion} onValueChange={setFilterUbicacion}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas</SelectItem>
                                            {ubicaciones.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Listado de Bienes</CardTitle>
                            <CardDescription>Mostrando {generalFilteredItems.length} ítems registrados.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderItemsTable(generalFilteredItems, "No se encontraron ítems con los filtros aplicados.")}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
    );
}
