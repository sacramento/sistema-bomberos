
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

    const handleSearch = (code: string) => {
        setSearchTerm(code);
        if (!code) {
            setDetailItem(null);
            return;
        }

        const exactCodeMatch = items.find(item => item.code.toLowerCase() === code.toLowerCase());
        if (exactCodeMatch) {
            setDetailItem(exactCodeMatch);
        } else {
            setDetailItem(null);
        }
    };

    // This function will be triggered when the search form is submitted
    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleSearch(searchTerm);
        if (!items.some(item => item.code.toLowerCase() === searchTerm.toLowerCase())) {
            toast({
                variant: "destructive",
                title: "Prenda no encontrada",
                description: `No se encontró la prenda con el código: ${searchTerm}.`,
            });
        }
    }


    const handleQrScan = (code: string) => {
        setSearchTerm(code); // Update search term to show context
        const foundItem = items.find(item => item.code.toLowerCase() === code.toLowerCase());
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
                        setSearchTerm(''); // Clear search term after closing dialog
                    }
                }}
            />
        </>
    );
}
