
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, QrCode } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Material } from "@/lib/types";
import { getMaterials, deleteMaterial } from "@/services/materials.service";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const materialTypes: Material['tipo'][] = ['Lanza', 'Manga', 'Corte', 'Combustion', 'Hidraulica', 'Golpe'];
const firehouses: Material['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

export default function MaterialsPage() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterFirehouse, setFilterFirehouse] = useState('all');
    const [searchCode, setSearchCode] = useState('');

    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Encargado', [activeRole]);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const data = await getMaterials();
            setMaterials(data);
        } catch (error) {
             toast({ title: "Error", description: "No se pudieron cargar los materiales.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchMaterials();
    }, [toast]);

    const handleDataChange = () => {
        fetchMaterials();
    };

    const handleDelete = async (materialId: string) => {
        try {
            await deleteMaterial(materialId);
            toast({ title: "¡Éxito!", description: "El material ha sido eliminado." });
            fetchMaterials();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo eliminar el material.", variant: "destructive" });
        }
    };
    
    const inventoryFilteredMaterials = useMemo(() => {
        return materials.filter(material => {
            const typeMatch = filterType === 'all' || material.tipo === filterType;
            const firehouseMatch = filterFirehouse === 'all' || material.cuartel === filterFirehouse;
            return typeMatch && firehouseMatch;
        });
    }, [materials, filterType, filterFirehouse]);

    const searchFilteredMaterials = useMemo(() => {
        if (!searchCode) return [];
        return materials.filter(material => {
            const searchLower = searchCode.toLowerCase();
            return material.nombre.toLowerCase().includes(searchLower) || material.codigo.toLowerCase().includes(searchLower);
        });
    }, [materials, searchCode]);

    const renderLocation = (material: Material) => {
        if (material.ubicacion.type === 'vehiculo') {
            return `Móvil ${material.vehiculo?.numeroMovil || '?'} (B: ${material.ubicacion.baulera})`;
        }
        return material.ubicacion.deposito;
    };
    
    const renderMaterialTable = (materialList: Material[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Estado</TableHead>
                    {canManage && <TableHead><span className="sr-only">Acciones</span></TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={canManage ? 6 : 5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                    ))
                ) : materialList.length > 0 ? (
                    materialList.map(material => (
                        <TableRow key={material.id}>
                            <TableCell className="font-mono">{material.codigo}</TableCell>
                            <TableCell className="font-medium">{material.nombre}</TableCell>
                            <TableCell>{material.tipo}</TableCell>
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
                    <TableRow><TableCell colSpan={canManage ? 6 : 5} className="h-24 text-center">No se encontraron materiales.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    );

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
            
            <Tabs defaultValue="search" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mb-4">
                    <TabsTrigger value="inventory">Inventario</TabsTrigger>
                    <TabsTrigger value="search">Búsqueda</TabsTrigger>
                </TabsList>
                
                <TabsContent value="inventory">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Filtros de Inventario</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        </CardContent>
                    </Card>

                    <Card className="mt-8">
                        <CardHeader>
                            <CardTitle className="font-headline">Inventario General</CardTitle>
                            <CardDescription>
                                Mostrando {inventoryFilteredMaterials.length} de {materials.length} materiales.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderMaterialTable(inventoryFilteredMaterials)}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="search">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Búsqueda de Material</CardTitle>
                            <CardDescription>Busque un material por su código o nombre.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <div className="relative flex-grow">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="search-material"
                                        placeholder="Ingrese código o nombre..."
                                        className="pl-9"
                                        value={searchCode}
                                        onChange={(e) => setSearchCode(e.target.value)}
                                    />
                                </div>
                                <Button variant="outline" size="icon" disabled>
                                    <QrCode className="h-5 w-5"/>
                                    <span className="sr-only">Escanear QR</span>
                                </Button>
                            </div>
                            {renderMaterialTable(searchFilteredMaterials)}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
    );
}

    
