
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, QrCode, Download, Loader2 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Material, Specialization, Vehicle } from "@/lib/types";
import { getMaterials, deleteMaterial } from "@/services/materials.service";
import { getVehicles } from "@/services/vehicles.service";
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
import QrScannerDialog from "./_components/qr-scanner-dialog";
import MaterialDetailDialog from "./_components/material-detail-dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';


const materialTypes: Material['tipo'][] = ['Lanza', 'Manga', 'Corte', 'Combustion', 'Hidraulica', 'Golpe'];
const specializations: Specialization[] = ['APH', 'BUCEO', 'FORESTAL', 'FUEGO', 'GORA', 'HAZ-MAT', 'KAIZEN', 'PAE', 'RESCATE', 'VARIOS'];
const firehouses: Material['cuartel'][] = ['Cuartel 1', 'Cuartel 2', 'Cuartel 3'];

export default function MaterialsPage() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterFirehouse, setFilterFirehouse] = useState('all');
    const [filterSpecialization, setFilterSpecialization] = useState('all');
    const [filterVehicle, setFilterVehicle] = useState('all');
    const [scannedMaterial, setScannedMaterial] = useState<Material | null>(null);
    const [activeTab, setActiveTab] = useState('search');
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Encargado', [activeRole]);

    const fetchMaterialsAndVehicles = async () => {
        setLoading(true);
        try {
            const [materialsData, vehiclesData] = await Promise.all([
                getMaterials(),
                getVehicles()
            ]);
            setMaterials(materialsData);
            setVehicles(vehiclesData);
        } catch (error) {
             toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchMaterialsAndVehicles();
        
        // Fetch logo for PDF generation
        const fetchLogo = async () => {
             try {
                const response = await fetch('https://i.ibb.co/yF0SYDNF/logo.png');
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    setLogoDataUrl(reader.result as string);
                };
                reader.readAsDataURL(blob);
             } catch (error) {
                 console.error("Failed to load logo for PDF", error);
                 toast({ title: "Advertencia", description: "No se pudo cargar el logo para el PDF.", variant: "default" });
             }
        }
        fetchLogo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDataChange = () => {
        fetchMaterialsAndVehicles();
    };

    const handleDelete = async (materialId: string) => {
        try {
            await deleteMaterial(materialId);
            toast({ title: "¡Éxito!", description: "El material ha sido eliminado." });
            fetchMaterialsAndVehicles();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo eliminar el material.", variant: "destructive" });
        }
    };
    
    const handleQrScan = (code: string) => {
        const foundMaterial = materials.find(m => m.codigo.toLowerCase() === code.toLowerCase());
        if (foundMaterial) {
            setScannedMaterial(foundMaterial);
        } else {
            setSearchTerm(code);
            setActiveTab('search');
            toast({
                variant: "destructive",
                title: "Material no encontrado",
                description: `No se encontró el código: ${code}.`,
            });
        }
    };

    const generatePdf = async () => {
        if (!logoDataUrl) {
            toast({ title: "Espere un momento", description: "El logo para el PDF aún se está cargando.", variant: "destructive" });
            return;
        }

        setGeneratingPdf(true);
        const doc = new jsPDF();
        
        try {
            // PDF Header
            doc.setFillColor(220, 53, 69);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text("Reporte de Inventario", 14, 22);
            doc.addImage(logoDataUrl!, 'PNG', doc.internal.pageSize.getWidth() - 35, 5, 25, 25, undefined, 'FAST');

            let currentY = 45;

            // Details Table
            doc.setFontSize(12);
            doc.setTextColor(40, 40, 40);
            doc.setFont('helvetica', 'bold');
            if(generalFilteredMaterials.length > 0) {
                doc.text("Inventario General Filtrado", 14, currentY);
                currentY += 5;
                 (doc as any).autoTable({
                    startY: currentY,
                    head: [['Código', 'Nombre', 'Ubicación', 'Cuartel', 'Estado', 'Condición']],
                    body: generalFilteredMaterials.map(item => [
                        item.codigo,
                        item.nombre,
                        item.ubicacion.type === 'deposito' ? `Depósito ${item.cuartel}` : `Móvil ${item.vehiculo?.numeroMovil} (B: ${item.ubicacion.baulera})`,
                        item.cuartel,
                        item.estado,
                        item.condicion,
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: '#333333' },
                });
            } else {
                doc.text("No se encontraron materiales con los filtros aplicados.", 14, currentY);
            }
            doc.save(`reporte-inventario-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            toast({ title: "Error al generar PDF", description: "Hubo un problema al crear el archivo PDF.", variant: "destructive" });
        } finally {
            setGeneratingPdf(false);
        }
    };
    
    const searchFilteredMaterials = useMemo(() => {
        if (!searchTerm) return [];
        return materials.filter(material => 
            material.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
            material.codigo.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [materials, searchTerm]);

    const generalFilteredMaterials = useMemo(() => {
        return materials.filter(material => {
            if (filterType !== 'all' && material.tipo !== filterType) return false;
            if (filterFirehouse !== 'all' && material.cuartel !== filterFirehouse) return false;
            if (filterSpecialization !== 'all' && material.especialidad !== filterSpecialization) return false;
            if (filterVehicle !== 'all' && material.ubicacion?.vehiculoId !== filterVehicle) return false;
            return true;
        });
    }, [materials, filterType, filterFirehouse, filterSpecialization, filterVehicle]);

    const statistics = useMemo(() => {
        const listToAnalyze = generalFilteredMaterials;
        const total = listToAnalyze.length;
        if (total === 0) {
            return {
                byCondition: { Bueno: 0, Regular: 0, Malo: 0 },
                byType: {}
            };
        }

        const byCondition = listToAnalyze.reduce((acc, mat) => {
            acc[mat.condicion] = (acc[mat.condicion] || 0) + 1;
            return acc;
        }, {} as Record<Material['condicion'], number>);

        const byType = listToAnalyze.reduce((acc, mat) => {
            acc[mat.tipo] = (acc[mat.tipo] || 0) + 1;
            return acc;
        }, {} as Record<Material['tipo'], number>);

        return { byCondition, byType };
    }, [generalFilteredMaterials]);

    const renderLocation = (material: Material) => {
        if (material.ubicacion.type === 'vehiculo') {
            return `Móvil ${material.vehiculo?.numeroMovil || '?'} (B: ${material.ubicacion.baulera})`;
        }
        return material.ubicacion.deposito;
    };
    
    return (
        <>
            <PageHeader title="Inventario de Materiales" description="Busque, filtre y gestione el inventario de materiales y equipos del cuartel.">
                {canManage && (
                    <AddMaterialDialog onMaterialAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Material
                        </Button>
                    </AddMaterialDialog>
                )}
            </PageHeader>
            
            <Tabs defaultValue="search" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-4">
                    <TabsTrigger value="search">Búsqueda Rápida</TabsTrigger>
                    <TabsTrigger value="inventory">Inventario General</TabsTrigger>
                </TabsList>
                
                <TabsContent value="search">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Búsqueda Rápida de Material</CardTitle>
                            <CardDescription>
                                Ingrese un código o nombre para buscar, o use el escáner QR.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="search-term">Buscar por Nombre o Código</Label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input id="search-term" placeholder="Buscar..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Acción Rápida</Label>
                                    <QrScannerDialog onScan={handleQrScan}>
                                        <Button size="lg" variant="outline" className="w-full">
                                            <QrCode className="mr-2 h-6 w-6"/>
                                            Escanear Código QR
                                        </Button>
                                    </QrScannerDialog>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    {searchTerm && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle className="font-headline">Resultados de la Búsqueda</CardTitle>
                                <CardDescription>
                                    Mostrando {searchFilteredMaterials.length} resultados para "{searchTerm}".
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Código</TableHead>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Ubicación</TableHead>
                                            <TableHead>Estado</TableHead>
                                            {canManage && <TableHead><span className="sr-only">Acciones</span></TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow><TableCell colSpan={canManage ? 5 : 4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                        ) : searchFilteredMaterials.length > 0 ? (
                                            searchFilteredMaterials.map(material => (
                                                <TableRow key={material.id}>
                                                    <TableCell className="font-mono">{material.codigo}</TableCell>
                                                    <TableCell className="font-medium">{material.nombre}</TableCell>
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
                                            <TableRow><TableCell colSpan={canManage ? 5 : 4} className="h-24 text-center">No se encontraron materiales.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="inventory">
                    <div className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Filtros de Inventario</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo</Label>
                                        <Select value={filterType} onValueChange={setFilterType}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                {materialTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cuartel</Label>
                                        <Select value={filterFirehouse} onValueChange={setFilterFirehouse}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                {firehouses.map(fh => <SelectItem key={fh} value={fh}>{fh}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Especialidad</Label>
                                        <Select value={filterSpecialization} onValueChange={setFilterSpecialization}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas</SelectItem>
                                                {specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Móvil</Label>
                                        <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.numeroMovil} - {v.marca}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Estadísticas del Inventario</CardTitle>
                                <CardDescription>Resumen de los materiales filtrados.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold mb-3">Condición General</h4>
                                    <div className="space-y-2">
                                        {(['Bueno', 'Regular', 'Malo'] as const).map(cond => {
                                            const count = statistics.byCondition?.[cond] || 0;
                                            const total = (statistics.byCondition?.Bueno || 0) + (statistics.byCondition?.Regular || 0) + (statistics.byCondition?.Malo || 0);
                                            const percentage = total > 0 ? (count / total) * 100 : 0;
                                            const color = cond === 'Bueno' ? 'bg-green-500' : cond === 'Regular' ? 'bg-yellow-500' : 'bg-red-500';
                                            return (
                                                <div key={cond}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span>{cond}</span>
                                                        <span>{count} ({percentage.toFixed(0)}%)</span>
                                                    </div>
                                                    <Progress value={percentage} indicatorClassName={color} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-3">Conteo por Tipo</h4>
                                    <div className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2">
                                        {Object.entries(statistics.byType || {}).sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => (
                                            <div key={type} className="flex justify-between p-2 rounded-md even:bg-muted/50">
                                                <span>{type}</span>
                                                <span className="font-bold">{count}</span>
                                            </div>
                                        ))}
                                        {Object.keys(statistics.byType || {}).length === 0 && <p className="text-muted-foreground text-center">Sin datos</p>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Inventario General</CardTitle>
                                <CardDescription>
                                    Mostrando {generalFilteredMaterials.length} de {materials.length} materiales.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Código</TableHead>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Ubicación</TableHead>
                                            <TableHead>Estado</TableHead>
                                            {canManage && <TableHead><span className="sr-only">Acciones</span></TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <TableRow key={i}><TableCell colSpan={canManage ? 5 : 4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                            ))
                                        ) : generalFilteredMaterials.length > 0 ? (
                                            generalFilteredMaterials.map(material => (
                                                <TableRow key={material.id}>
                                                    <TableCell className="font-mono">{material.codigo}</TableCell>
                                                    <TableCell className="font-medium">{material.nombre}</TableCell>
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
                                            <TableRow><TableCell colSpan={canManage ? 5 : 4} className="h-24 text-center">No se encontraron materiales con los filtros aplicados.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Exportar Reporte</CardTitle>
                                <CardDescription>Genere un archivo PDF con los resultados filtrados.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={generatePdf} disabled={generatingPdf || generalFilteredMaterials.length === 0}>
                                    {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                    {generatingPdf ? "Generando..." : "Generar PDF"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
            
            <MaterialDetailDialog
                material={scannedMaterial}
                open={!!scannedMaterial}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setScannedMaterial(null);
                    }
                }}
            />
        </>
    );
}
