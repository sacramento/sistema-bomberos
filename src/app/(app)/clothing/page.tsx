
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, QrCode, Copy } from "lucide-react";
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

export default function ClothingPage() {
    const [items, setItems] = useState<ClothingItem[]>([]);
    const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

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

    const filteredItems = useMemo(() => {
        if (!searchTerm) return items;
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

    return (
        <>
            <PageHeader title="Inventario de Ropa" description="Gestione el equipamiento personal de cada bombero.">
                <div className='flex flex-col sm:flex-row gap-2'>
                    <AddClothingItemDialog onSave={handleDataChange} firefighters={firefighters}>
                        <Button className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Prenda
                        </Button>
                    </AddClothingItemDialog>
                </div>
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Listado de Prendas</CardTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por código, tipo o bombero..." 
                            className="pl-9" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
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
                                <TableHead><span className="sr-only">Acciones</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
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
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center">No se encontraron prendas.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
