
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, QrCode, Upload, Filter, LayoutList, ArrowRight, Copy } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { ClothingItem, Firefighter } from "@/lib/types";
import { getClothingItems, deleteClothingItem } from "@/services/clothing.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import AddClothingItemDialog from "./_components/add-clothing-item-dialog";
import EditClothingItemDialog from "./_components/edit-clothing-item-dialog";
import QrScannerDialog from "./_components/qr-scanner-dialog";
import { useAuth } from "@/context/auth-context";
import { usePathname, useRouter } from "next/navigation";
import ImportClothingDialog from "./_components/import-clothing-dialog";
import ClothingDetailDialog from "./_components/clothing-detail-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function ClothingPage() {
    const [items, setItems] = useState<ClothingItem[]>([]);
    const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailItem, setDetailItem] = useState<ClothingItem | null>(null);
    const [cloningItem, setCloningItem] = useState<ClothingItem | null>(null);
    const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('inventory');
    
    const { toast } = useToast();
    const router = useRouter();
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

    const handleSearch = (code: string) => {
        if (!code) {
            setDetailItem(null);
            return;
        }

        const exactCodeMatch = items.find(item => item.code.toLowerCase() === code.toLowerCase());
        if (exactCodeMatch) {
            setDetailItem(exactCodeMatch);
        } else {
            setDetailItem(null);
            toast({
                variant: "destructive",
                title: "Prenda no encontrada",
                description: `No se encontró la prenda con el código: ${code}.`,
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
    
     const handleCloneClick = (item: ClothingItem) => {
        setCloningItem(item);
        setIsCloneDialogOpen(true);
    };

    if (activeRole === 'Bombero' || activeRole === 'Oficial') {
        return (
            <>
                <PageHeader title="Inventario de Ropa" description="Acceso denegado."/>
                <p>No tienes permiso para acceder a esta sección.</p>
            </>
        )
    }

    const filteredItems = useMemo(() => {
        if (!searchTerm) return items;
        return items.filter(i => 
            i.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
            i.type.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [items, searchTerm]);

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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-xl mx-auto mb-6">
                    <TabsTrigger value="search">Búsqueda</TabsTrigger>
                    <TabsTrigger value="inventory">Inventario</TabsTrigger>
                    <TabsTrigger value="reports">Informes</TabsTrigger>
                </TabsList>

                <TabsContent value="search">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Búsqueda Rápida</CardTitle>
                            <form onSubmit={handleFormSubmit}>
                                <div className="flex flex-col sm:flex-row gap-4 mt-2">
                                    <div className="relative flex-grow">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input 
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
                        </CardHeader>
                        <CardContent>
                            <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                                <p>Realice una búsqueda o escanee un código QR para ver los detalles de una prenda.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="inventory">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Listado de Prendas</CardTitle>
                            <CardDescription>Total de elementos registrados: {items.length}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Talle</TableHead>
                                        <TableHead>Asignado a</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                        ))
                                    ) : items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-mono text-xs font-bold">{item.code}</TableCell>
                                            <TableCell className="text-sm font-medium">{item.type}</TableCell>
                                            <TableCell className="text-xs">{item.size}</TableCell>
                                            <TableCell className="text-xs">{item.firefighter ? `${item.firefighter.lastName}, ${item.firefighter.firstName}` : 'En Depósito'}</TableCell>
                                            <TableCell><Badge className="text-[10px]">{item.state}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <AlertDialog>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => setDetailItem(item)}>Ver Detalles</DropdownMenuItem>
                                                            <EditClothingItemDialog item={item} onSave={handleDataChange} firefighters={firefighters}>
                                                                <DropdownMenuItem onSelect={e => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                                                            </EditClothingItemDialog>
                                                            <DropdownMenuItem onClick={() => handleCloneClick(item)}><Copy className="mr-2 h-4 w-4"/>Clonar</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem className='text-destructive'><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle></AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(item.id)} variant="destructive">Eliminar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Reportes de Ropería</CardTitle>
                            <CardDescription>Generación de fichas de entrega y reportes de stock por bombero.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center py-10">
                            <Button size="lg" onClick={() => router.push('/clothing-reports')}>
                                Abrir Panel de Informes <ArrowRight className="ml-2 h-5 w-5"/>
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

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
                        setSearchTerm('');
                    }
                }}
            />
        </>
    );
}
