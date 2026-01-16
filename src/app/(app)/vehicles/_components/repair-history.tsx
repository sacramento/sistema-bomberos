
'use client';

import { useState, useEffect } from 'react';
import { RepairRecord, LoggedInUser } from '@/lib/types';
import { getRepairRecordsByVehicle, deleteRepairRecord } from '@/services/repairs.service';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Gauge, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface RepairHistoryProps {
    vehicleId: string;
    canManage: boolean;
    refreshSignal: boolean;
    actor: LoggedInUser;
}

export default function RepairHistory({ vehicleId, canManage, refreshSignal, actor }: RepairHistoryProps) {
    const [records, setRecords] = useState<RepairRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const data = await getRepairRecordsByVehicle(vehicleId);
            setRecords(data);
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron cargar los registros de reparaciones.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        if (vehicleId) {
            fetchRecords();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vehicleId, refreshSignal]);

    const handleDeleteRecord = async (recordId: string) => {
        if (!actor) return;
        try {
            await deleteRepairRecord(recordId, actor);
            toast({ title: "Registro eliminado", description: "El registro de reparación ha sido eliminado." });
            fetchRecords();
        } catch (error: any) {
            toast({ title: "Error", description: "No se pudo eliminar el registro.", variant: "destructive" });
        }
    }

    if (loading) {
        return <Skeleton className="h-96 w-full" />;
    }

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline">Historial de Reparaciones</CardTitle>
                    <CardDescription>Reparaciones realizadas en este móvil, del más reciente al más antiguo.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                {records.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {records.map(record => (
                            <AccordionItem key={record.id} value={record.id}>
                                <AccordionTrigger>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full pr-4 text-left">
                                        <div className="font-semibold text-base">{record.repairType} - {format(parseISO(record.date), 'PPP', { locale: es })}</div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <Gauge className="h-4 w-4"/> {record.mileage.toLocaleString('es-AR')} km
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="p-4 border-t bg-muted/50 rounded-b-lg">
                                        {canManage && (
                                            <div className="flex justify-end mb-2">
                                                <AlertDialog>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreVertical className="h-4 w-4"/>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                                            <AlertDialogDescription>Esta acción es irreversible y eliminará el registro de reparación.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteRecord(record.id)} variant="destructive">Sí, eliminar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        )}

                                        <h4 className="font-semibold mt-4 mb-2">Detalle de la Reparación:</h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.details}</p>

                                        <h4 className="font-semibold mt-4 mb-2">Personal Interviniente:</h4>
                                        <p className="text-sm text-muted-foreground">{record.personnel?.map(p => p.lastName).join(', ') || 'N/A'}</p>
                                        
                                        {record.externalPersonnel && (
                                            <>
                                                <h4 className="font-semibold mt-4 mb-2">Personal Externo:</h4>
                                                <p className="text-sm text-muted-foreground">{record.externalPersonnel}</p>
                                            </>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No hay registros de reparaciones para este móvil.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
