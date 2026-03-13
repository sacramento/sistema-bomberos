
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, QrCode, Download, Loader2, Filter, Sparkles, LayoutList } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { GeneralInventoryItem } from "@/lib/types";
import { getGeneralInventory, deleteGeneralInventoryItem } from "@/services/general-inventory.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

const cuarteles = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3', 'Comision'];
const ubicaciones = ['Baño', 'Matera', 'Cocina', 'Roperia', 'Cadetes', 'Deposito', 'Jefatura', 'Cambiaderos', 'Patio', 'Playón', 'Guardia', 'Ayudantia'];
const condiciones = ['Bueno', 'Regular', 'Malo'];

export default function InventoryPage() {
    const [items, setItems] = useState<GeneralInventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [activeTab, setActiveTab] = useState('inventory');

    // Filters for Report
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterCuartel, setFilterCuartel] = useState('all');
    const [filterUbicacion, setFilterUbicacion] = useState('all');
    const [filterCondicion, setFilterCondicion] = useState('all');

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
             toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchItems();
    }, []);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            if (filterCategory !== 'all' && item.categoryId !== filterCategory) return false;
            if (filterCuartel !== 'all' && item.cuartel !== filterCuartel) return false;
            if (filterUbicacion !== 'all' && item.ubicacion !== filterUbicacion) return false;
            if (filterCondicion !== 'all' && item.condicion !== filterCondicion) return false;
            if (searchTerm && !item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) && !item.codigo.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        });
    }, [items, filterCategory, filterCuartel, filterUbicacion, filterCondicion, searchTerm]);

    const handleDelete = async (itemId: string) => {
        if (!user) return;
        try {
            await deleteGeneralInventoryItem(itemId, user);
            toast({ title: "¡Éxito!", description: "El ítem ha sido eliminado." });
            fetchItems();
        } catch (error: any) {
            toast({ title: "Error", variant: "destructive", description: error.message });
        }
    };

    const generatePdf = async () => {
        setGeneratingPdf(true);
        const doc = new jsPDF('l', 'mm', 'a4');
        try {
            doc.setFillColor(34, 43, 54);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text("Inventario General - Reporte Técnico", 14, 22);
            
            let currentY = 45;
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generado el: ${format(new Date(), 'Pp')}`, 14, currentY);
            currentY += 10;

            (doc as any).autoTable({
                startY: currentY,
                head: [['Código', 'Nombre', 'Marca/Modelo', 'Cuartel', 'Ubicación', 'Condición', 'Estado']],
                body: filteredItems.map(i => [
                    i.codigo,
                    i.nombre,
                    `${i.marca || ''} ${i.modelo || ''}`.trim() || '-',
                    i.cuartel,
                    i.ubicacion,
                    i.condicion,
                    i.estado
                ]),
                theme: 'striped',
                headStyles: { fillColor: '#333333' },
                styles: { fontSize: 8 }
            });

            doc.save(`inventario-general-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } finally {
            setGeneratingPdf(false);
        }
    };

    const renderTable = (itemsToList: GeneralInventoryItem[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Estado</TableHead>
                    {canManage && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                    ))
                ) : itemsToList.map(item => (
                    <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs font-bold">{item.codigo}</TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="font-medium text-sm">{item.nombre}</span>
                                {item.marca && <span className="text-[10px] text-muted-foreground">{item.marca} {item.modelo}</span>}
                            </div>
                        </TableCell>
                        <TableCell className="text-xs">{item.cuartel} - {item.ubicacion}</TableCell>
                        <TableCell>
                            <Badge variant={item.estado === 'En Servicio' ? 'default' : 'destructive'} className="text-[10px]">
                                {item.estado}
                            </Badge>
                        </TableCell>
                        {canManage && (
                            <TableCell className="text-right">
                                <AlertDialog>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <EditInventoryItemDialog item={item} onItemUpdated={fetchItems}>
                                                <DropdownMenuItem onSelect={e => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                                            </EditInventoryItemDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem className='text-destructive' onSelect={e => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem>
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
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    return (
        <>
            <PageHeader title="Inventario General" description="Gestión de muebles y útiles de Ayudantía.">
                {canManage && (
                    <AddInventoryItemDialog onItemAdded={fetchItems}>
                        <Button><PlusCircle className="mr-2 h-4 w-4" /> Agregar Ítem</Button>
                    </AddInventoryItemDialog>
                )}
            </PageHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-xl mx-auto mb-6">
                    <TabsTrigger value="inventory"><LayoutList className="mr-2 h-4 w-4"/>Inventario</TabsTrigger>
                    <TabsTrigger value="search"><QrCode className="mr-2 h-4 w-4"/>Búsqueda</TabsTrigger>
                    <TabsTrigger value="reports"><Filter className="mr-2 h-4 w-4"/>Informes</TabsTrigger>
                </TabsList>

                <TabsContent value="inventory">
                    <Card>
                        <CardHeader><CardTitle>Bienes Registrados</CardTitle></CardHeader>
                        <CardContent>{renderTable(items)}</CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="search">
                    <Card>
                        <CardHeader>
                            <CardTitle>Búsqueda Rápida</CardTitle>
                            <div className="flex gap-4 mt-4">
                                <div className="relative flex-grow">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Buscar por código o nombre..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                                <QrScannerDialog onScan={(c) => { setSearchTerm(c); setActiveTab('search'); }}>
                                    <Button variant="outline"><QrCode className="mr-2 h-4 w-4"/>Escanear</Button>
                                </QrScannerDialog>
                            </div>
                        </CardHeader>
                        <CardContent>{searchTerm && renderTable(filteredItems)}</CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Filtros del Reporte Técnico</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>Categoría</Label>
                                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas</SelectItem>
                                            {INVENTORY_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Cuartel</Label>
                                    <Select value={filterCuartel} onValueChange={setFilterCuartel}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            {cuarteles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Condición</Label>
                                    <Select value={filterCondicion} onValueChange={setFilterCondicion}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas</SelectItem>
                                            {condiciones.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-end">
                                    <Button className="w-full" onClick={generatePdf} disabled={generatingPdf || filteredItems.length === 0}>
                                        {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                                        Exportar PDF ({filteredItems.length})
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">{renderTable(filteredItems)}</CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </>
    );
}
