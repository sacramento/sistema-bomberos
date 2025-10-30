
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import AddInventoryItemDialog from "./_components/add-inventory-item-dialog";
import EditInventoryItemDialog from "./_components/edit-inventory-item-dialog";

const itemTypes: GeneralInventoryItem['tipo'][] = ['Moviliario', 'electronica', 'herramientas'];
const cuarteles: GeneralInventoryItem['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3', 'Comision'];
const ubicaciones: GeneralInventoryItem['ubicacion'][] = ['Baño', 'Matera', 'Cocina', 'Roperia', 'Cadetes', 'Deposito', 'Jefatura', 'Cambiaderos', 'Patio', 'Playón', 'Guardia'];

export default function InventoryPage() {
    const [items, setItems] = useState<GeneralInventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterCuartel, setFilterCuartel] = useState('all');
    const [filterUbicacion, setFilterUbicacion] = useState('all');

    const { toast } = useToast();
    const { getActiveRole } = useAuth();
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
        try {
            await deleteGeneralInventoryItem(itemId);
            toast({ title: "¡Éxito!", description: "El ítem ha sido eliminado." });
            fetchItems();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo eliminar el ítem.", variant: "destructive" });
        }
    };
    
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            if (searchTerm && !(item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || item.codigo.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
            if (filterType !== 'all' && item.tipo !== filterType) return false;
            if (filterCuartel !== 'all' && item.cuartel !== filterCuartel) return false;
            if (filterUbicacion !== 'all' && item.ubicacion !== filterUbicacion) return false;
            return true;
        });
    }, [items, searchTerm, filterType, filterCuartel, filterUbicacion]);

    return (
        <>
            <PageHeader title="Inventario General" description="Gestione el inventario general de los cuarteles y la comisión.">
                {canManage && (
                    <AddInventoryItemDialog onItemAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Ítem
                        </Button>
                    </AddInventoryItemDialog>
                )}
            </PageHeader>
            
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="font-headline">Filtros del Inventario</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="search-term">Buscar por Nombre o Código</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input id="search-term" placeholder="Buscar..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {itemTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
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
                    <CardTitle className="font-headline">Listado de Ítems</CardTitle>
                    <CardDescription>Mostrando {filteredItems.length} ítems según los filtros aplicados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Cuartel</TableHead>
                                <TableHead>Ubicación</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Condición</TableHead>
                                {canManage && <TableHead><span className="sr-only">Acciones</span></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={canManage ? 8 : 7}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                ))
                            ) : filteredItems.length > 0 ? (
                                filteredItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono">{item.codigo}</TableCell>
                                        <TableCell className="font-medium">{item.nombre}</TableCell>
                                        <TableCell>{item.cuartel}</TableCell>
                                        <TableCell>{item.ubicacion}</TableCell>
                                        <TableCell><Badge variant="outline">{item.tipo}</Badge></TableCell>
                                        <TableCell><Badge variant={item.estado === 'En Servicio' ? 'default' : 'destructive'} className={item.estado === 'En Servicio' ? 'bg-green-600' : ''}>{item.estado}</Badge></TableCell>
                                        <TableCell>{item.condicion}</TableCell>
                                        {canManage && (
                                        <TableCell>
                                            <AlertDialog>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
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
                                <TableRow><TableCell colSpan={canManage ? 8 : 7} className="h-24 text-center">No se encontraron ítems con los filtros aplicados.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
