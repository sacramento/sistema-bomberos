
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, QrCode, Copy, Upload } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { ClothingItem, Firefighter } from "@/lib/types";
import { getClothingItems, deleteClothingItem } from "@/services/clothing.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import AddClothingItemDialog from "./_components/add-clothing-item-dialog";
import EditClothingItemDialog from "./_components/edit-clothing-item-dialog";
import QrScannerDialog from "./_components/qr-scanner-dialog";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import ImportClothingDialog from "./_components/import-clothing-dialog";
import ClothingDetailDialog from "./_components/clothing-detail-dialog";


export default function ClothingPage() {
    const [items, setItems] = useState<ClothingItem[]>([]);
    const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailItem, setDetailItem] = useState<ClothingItem | null>(null);
    const [cloningItem, setCloningItem] = useState<ClothingItem | null>(null);
    const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
    
    const { toast } = useToast();
    const { getActiveRole } = useAuth();
    const pathname = usePathname();

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Encargado', [activeRole]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [itemsData, firefightersData] = await Promise.all([
                getClothingItems(),
                getFirefighters(),
            ]);
            setItems(itemsData);
            setFirefighters(firefightersData);
        } catch (error) {
             toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDataChange = () => {
        fetchData();
    };

    const handleDelete = async (itemId: string) => {
        try {
            await deleteClothingItem(itemId);
            toast({ title: "¡Éxito!", description: "La prenda ha sido eliminada." });
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo eliminar la prenda.", variant: "destructive" });
        }
    };

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        const results = items.filter(item => 
            item.code.toLowerCase().includes(term.toLowerCase()) || 
            item.type.toLowerCase().includes(term.toLowerCase()) ||
            item.firefighter?.lastName.toLowerCase().includes(term.toLowerCase())
        );

        if (results.length === 1) {
            setDetailItem(results[0]);
        }
    };

    const handleQrScan = (code: string) => {
        const foundItem = items.find(item => item.code.toLowerCase() === code.toLowerCase());
        setSearchTerm(code); // Update search term to show context
        if (foundItem) {
            setDetailItem(foundItem); // Open modal with details
        } else {
            setDetailItem(null); // Ensure modal is closed
            toast({
                variant: "destructive",
                title: "Prenda no encontrada",
                description: `No se encontró la prenda con el código: ${code}.`,
            });
        }
    };
    
     const handleCloneClick = (item: ClothingItem) => {
        setCloningItem(item);
        setIsCloneDialogOpen(true);
    };

    const filteredItems = useMemo(() => {
        if (!searchTerm) return [];
        return items.filter(item => 
            item.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
            item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.firefighter?.lastName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [items, searchTerm]);

    const getStateBadge = (state: ClothingItem['state']) => {
        switch(state) {
            case 'Nuevo': return <Badge variant="default" className="bg-sky-500">Nuevo</Badge>;
            case 'Bueno': return <Badge variant="default" className="bg-green-600">Bueno</Badge>;
            case 'Regular': return <Badge variant="secondary" className="bg-yellow-500 text-black">Regular</Badge>;
            case 'Malo': return <Badge variant="destructive" className="bg-orange-600">Malo</Badge>;
            case 'Baja': return <Badge variant="destructive">Baja</Badge>;
            default: return <Badge variant="outline">{state}</Badge>;
        }
    }

    if (activeRole === 'Bombero' || activeRole === 'Oficial') {
        return (
            <>
                <PageHeader title="Inventario de Ropa" description="Acceso denegado."/>
                <p>No tienes permiso para acceder a esta sección.</p>
            </>
        )
    }

    return (
        <>
            <PageHeader title="Inventario de Ropa" description="Gestione el equipamiento personal de cada bombero.">
                {canManage && (
                    <div className='flex flex-col sm:flex-row gap-2'>
                        <ImportClothingDialog onImportSuccess={handleDataChange}>
                            <Button variant="outline" className="w-full">
                                <Upload className="mr-2 h-4 w-4" />
                                Importar CSV
                            </Button>
                        </ImportClothingDialog>
                        <AddClothingItemDialog onSave={handleDataChange} firefighters={firefighters}>
                            <Button className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Agregar Prenda
                            </Button>
                        </AddClothingItemDialog>
                    </div>
                )}
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Búsqueda Rápida</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-4 mt-2">
                        <div className="relative flex-grow">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar por código, tipo o bombero..." 
                                className="pl-9" 
                                value={searchTerm} 
                                onChange={(e) => handleSearch(e.target.value)} 
                            />
                        </div>
                        <QrScannerDialog onScan={handleQrScan}>
                            <Button variant="outline" className="w-full sm:w-auto">
                                <QrCode className="mr-2 h-4 w-4" />
                                Escanear QR
                            </Button>
                        </QrScannerDialog>
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Talle</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Asignado a</TableHead>
                                {canManage && <TableHead><span className="sr-only">Acciones</span></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={canManage ? 7 : 6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                ))
                            ) : filteredItems.length > 0 ? (
                                filteredItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono">{item.code}</TableCell>
                                        <TableCell className="font-medium">{item.type}</TableCell>
                                        <TableCell>{item.category}/{item.subCategory}</TableCell>
                                        <TableCell>{item.size}</TableCell>
                                        <TableCell>{getStateBadge(item.state)}</TableCell>
                                        <TableCell>{item.firefighter ? `${item.firefighter.lastName}, ${item.firefighter.firstName}` : 'En Depósito'}</TableCell>
                                        {canManage && (
                                            <TableCell>
                                                <AlertDialog>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                            <EditClothingItemDialog item={item} onSave={handleDataChange} firefighters={firefighters}>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                                                            </EditClothingItemDialog>
                                                            <DropdownMenuItem onSelect={() => handleCloneClick(item)}><Copy className="mr-2 h-4 w-4"/>Clonar</DropdownMenuItem>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                                            <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente la prenda con código "{item.code}".</AlertDialogDescription>
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
                                <TableRow><TableCell colSpan={canManage ? 7 : 6} className="h-24 text-center">{searchTerm ? 'No se encontraron prendas con ese criterio.' : 'Realice una búsqueda o escanee un código QR para ver los resultados.'}</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
            </Card>

            <AddClothingItemDialog 
                open={isCloneDialogOpen}
                onOpenChange={setIsCloneDialogOpen}
                onSave={() => {
                    handleDataChange();
                    setIsCloneDialogOpen(false);
                }}
                firefighters={firefighters}
                initialData={cloningItem}
            />

            <ClothingDetailDialog
                item={detailItem}
                open={!!detailItem}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setDetailItem(null);
                    }
                }}
            />
        </>
    );
}
