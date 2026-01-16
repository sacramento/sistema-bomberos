
'use client';

import { useState, useEffect } from 'react';
import { SparePart, LoggedInUser } from '@/lib/types';
import { getSparePartsByVehicle, deleteSparePart } from '@/services/spare-parts.service';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import AddSparePartDialog from './AddSparePartDialog';
import EditSparePartDialog from './EditSparePartDialog';

interface SparePartsManagerProps {
    vehicleId: string;
    canManage: boolean;
    actor: LoggedInUser;
}

export default function SparePartsManager({ vehicleId, canManage, actor }: SparePartsManagerProps) {
    const [spareParts, setSpareParts] = useState<SparePart[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchSpareParts = async () => {
        setLoading(true);
        try {
            const data = await getSparePartsByVehicle(vehicleId);
            setSpareParts(data);
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron cargar los repuestos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (vehicleId) {
            fetchSpareParts();
        }
    }, [vehicleId]);

    const handleDataChange = () => {
        fetchSpareParts();
    };

    const handleDelete = async (partId: string) => {
        try {
            await deleteSparePart(partId, actor);
            toast({ title: "Repuesto eliminado" });
            fetchSpareParts();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo eliminar el repuesto.", variant: "destructive" });
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline">Gestión de Repuestos</CardTitle>
                    <CardDescription>Listado de repuestos específicos para este móvil.</CardDescription>
                </div>
                {canManage && (
                    <AddSparePartDialog vehicleId={vehicleId} onPartAdded={handleDataChange} actor={actor}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Repuesto
                        </Button>
                    </AddSparePartDialog>
                )}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Marca</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Observaciones</TableHead>
                            {canManage && <TableHead><span className="sr-only">Acciones</span></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={canManage ? 5 : 4}><Skeleton className="h-5 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : spareParts.length > 0 ? (
                            spareParts.map(part => (
                                <TableRow key={part.id}>
                                    <TableCell className="font-medium">{part.name}</TableCell>
                                    <TableCell>{part.brand || 'N/A'}</TableCell>
                                    <TableCell>{part.code || 'N/A'}</TableCell>
                                    <TableCell>{part.observations || 'N/A'}</TableCell>
                                    {canManage && (
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <EditSparePartDialog part={part} onPartUpdated={handleDataChange} actor={actor}>
                                                            <DropdownMenuItem onSelect={e => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                                                        </EditSparePartDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={e => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                                        <AlertDialogDescription>Esta acción eliminará el repuesto "{part.name}" permanentemente.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(part.id)} variant="destructive">Eliminar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={canManage ? 5 : 4} className="h-24 text-center">No hay repuestos registrados para este móvil.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
