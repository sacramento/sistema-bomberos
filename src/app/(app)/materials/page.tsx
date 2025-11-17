
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, QrCode, Download, Loader2, Copy, Upload } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Material, Specialization, Vehicle, Firefighter } from "@/lib/types";
import { getMaterials, deleteMaterial, deleteAllMaterials } from "@/services/materials.service";
import { getVehicles } from "@/services/vehicles.service";
import { getFirefighters } from "@/services/firefighters.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import AddMaterialDialog from "./_components/add-material-dialog";
import QrScannerDialog from "./_components/qr-scanner-dialog";
import MaterialDetailDialog from "./_components/material-detail-dialog";
import ImportMaterialsDialog from "./_components/import-materials-dialog";


export default function MaterialsPage() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailItem, setDetailItem] = useState<Material | null>(null);
    const [cloningMaterial, setCloningMaterial] = useState<Material | null>(null);
    const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
    
    const { toast } = useToast();
    const { getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);
    const canManageGlobally = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);


    const fetchAllData = async () => {
        setLoading(true);
        try {
            const materialsData = await getMaterials();
            setMaterials(materialsData);
        } catch (error) {
             toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDataChange = () => {
        fetchAllData();
    };

    const handleSearch = (code: string) => {
        if (!code) {
            setDetailItem(null);
            return;
        }
        const exactCodeMatch = materials.find(item => item.codigo.toLowerCase() === code.toLowerCase());
        if (exactCodeMatch) {
            setDetailItem(exactCodeMatch);
        } else {
            setDetailItem(null);
            toast({
                variant: "destructive",
                title: "Material no encontrado",
                description: `No se encontró el material con el código: ${code}.`,
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

    return (
        <>
            <PageHeader title="Inventario de Materiales" description="Busque, filtre y gestione el inventario de materiales y equipos del cuartel.">
                {canManageGlobally && (
                    <div className='flex flex-col sm:flex-row gap-2'>
                        <ImportMaterialsDialog onImportSuccess={handleDataChange}>
                             <Button variant="outline" className="w-full">
                                <Upload className="mr-2 h-4 w-4" />
                                Importar CSV
                            </Button>
                        </ImportMaterialsDialog>
                        <AddMaterialDialog onMaterialAdded={handleDataChange}>
                            <Button className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Agregar Material
                            </Button>
                        </AddMaterialDialog>
                    </div>
                )}
            </PageHeader>
            
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Búsqueda de Material</CardTitle>
                        <CardDescription>
                        Ingrese un código para buscar, o use el escáner QR.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-grow">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="search-term"
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
                </CardContent>
            </Card>

            <div className="mt-6 text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                <p>Realice una búsqueda o escanee un código QR para ver los detalles de un material.</p>
            </div>
            
            <AddMaterialDialog 
                open={isCloneDialogOpen}
                onOpenChange={setIsCloneDialogOpen}
                onMaterialAdded={() => {
                    handleDataChange();
                    setIsCloneDialogOpen(false); // Close dialog on success
                }}
                initialData={cloningMaterial}
            />
            
            <MaterialDetailDialog
                material={detailItem}
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
