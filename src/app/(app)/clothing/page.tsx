'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, QrCode, Upload, Filter, ArrowRight, Copy } from "lucide-react";
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
    const { toast } = useToast();
    const router = useRouter();
    const { getActiveRole, user } = useAuth();
    const pathname = usePathname();

    const [items, setItems] = useState<ClothingItem[]>([]);
    const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailItem, setDetailItem] = useState<ClothingItem | null>(null);
    const [cloningItem, setCloningItem] = useState<ClothingItem | null>(null);
    const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('inventory');
    
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Encargado', [activeRole]);
    const isConsultant = activeRole === 'Bombero' || activeRole === 'Oficial';

    const fetchData = async () => {
        if (!user) return;
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
        if (isMounted && user) {
            fetchData();
        }
    }, [isMounted, user]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return items;
        return items.filter(i => 
            i.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
            i.type.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [items, searchTerm]);

    const handleDataChange = () => {
        fetchData();
    };

    const handleDelete = async (itemId: string) => {
        if (!user) return;
        try {
            await deleteClothingItem(itemId, user);
            toast({ title: "¡Éxito!", description: "Prenda eliminada." });
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
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
            toast({ variant: "destructive", title: "No encontrado", description: `Código: ${code}` });
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

    if (!isMounted) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

    if (isConsultant) {
        return (
            <>
                <PageHeader title="Inventario de Ropa" description="Acceso denegado."/>
                <div className="p-10 text-center border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No tienes permisos para gestionar el inventario de ropería.</p>
                </div>
            </>
        )
    }

    return (
        <>
            <PageHeader title="Inventario de Ropa" description="Gestión de equipo personal.">
                {canManage && (
                    <div className='flex flex-col sm:flex-row gap-2'>
                        <ImportClothingDialog onImportSuccess={handleDataChange}>
                            <Button variant="outline" className="w-full"><Upload className="mr-2 h-4 w-4" /> Importar CSV</Button>
                        </ImportClothingDialog>
                        <AddClothingItemDialog onSave={handleDataChange} firefighters={firefighters}>
                            <Button className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Agregar Prenda</Button>
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
                    <Card><CardHeader><CardTitle className="font-headline">Búsqueda Rápida</CardTitle><form onSubmit={handleFormSubmit}><div className="flex flex-col sm:flex-row gap-4 mt-2"><div className="relative flex-grow"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Código..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div><QrScannerDialog onScan={handleQrScan}><Button variant="outline" type="button"><QrCode className="mr-2 h-4 w-4" /> Escanear</Button></QrScannerDialog><Button type="submit">Buscar</Button></div></form></CardHeader><CardContent><div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg"><p>Realice una búsqueda o escanee QR.</p></div></CardContent></Card>
                </TabsContent>
                <TabsContent value="inventory">
                    <Card><CardHeader><CardTitle>Prendas</CardTitle><CardDescription>Total: {items.length}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Tipo</TableHead><TableHead>Talle</TableHead><TableHead>Asignado</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={6}><Skeleton className="h-10 w-full"/></TableCell></TableRow> : filteredItems.map(item => (<TableRow key={item.id}><TableCell className="font-mono text-xs font-bold">{item.code}</TableCell><TableCell className="text-sm font-medium">{item.type}</TableCell><TableCell className="text-xs">{item.size}</TableCell><TableCell className="text-xs">{item.firefighter ? `${item.firefighter.lastName}` : 'Depósito'}</TableCell><TableCell><Badge className="text-[10px]">{item.state}</Badge></TableCell><TableCell className="text-right"><AlertDialog><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setDetailItem(item)}>Ver Detalles</DropdownMenuItem><EditClothingItemDialog item={item} onSave={handleDataChange} firefighters={firefighters}><DropdownMenuItem onSelect={e => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem></EditClothingItemDialog><DropdownMenuItem onClick={() => handleCloneClick(item)}><Copy className="mr-2 h-4 w-4"/>Clonar</DropdownMenuItem><DropdownMenuSeparator /><AlertDialogTrigger asChild><DropdownMenuItem className='text-destructive'><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem></AlertDialogTrigger></DropdownMenuContent></DropdownMenu><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)} variant="destructive">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
                </TabsContent>
                <TabsContent value="reports">
                    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Reportes</CardTitle></CardHeader><CardContent className="flex justify-center py-10"><Button size="lg" onClick={() => router.push('/clothing-reports')}>Panel de Informes <ArrowRight className="ml-2 h-5 w-5"/></Button></CardContent></Card>
                </TabsContent>
            </Tabs>
            <AddClothingItemDialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen} onSave={() => { handleDataChange(); setIsCloneDialogOpen(false); }} firefighters={firefighters} initialData={cloningItem} />
            <ClothingDetailDialog item={detailItem} open={!!detailItem} onOpenChange={(isOpen) => { if (!isOpen) { setDetailItem(null); setSearchTerm(''); } }} />
        </>
    );
}
