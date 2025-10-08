
'use client';

import { useState, useEffect } from 'react';
import { MaintenanceRecord, MaintenanceChecklistItem } from '@/lib/types';
import { getMaintenanceRecordsByVehicle, deleteMaintenanceRecord } from '@/services/maintenance.service';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, X, Gauge, Calendar, PlusCircle, Trash2, Edit, MoreVertical } from 'lucide-react';
import AddMaintenanceRecordDialog from './add-maintenance-record-dialog';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface MaintenanceHistoryProps {
    vehicleId: string;
    canEdit: boolean;
    refreshSignal: boolean;
    onDataChange: () => void;
}

export default function MaintenanceHistory({ vehicleId, canEdit, refreshSignal, onDataChange }: MaintenanceHistoryProps) {
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const data = await getMaintenanceRecordsByVehicle(vehicleId);
            setRecords(data);
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron cargar los registros de mantenimiento.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchRecords();
    }, [vehicleId, toast, refreshSignal]);

    const handleDeleteRecord = async (recordId: string) => {
        try {
            await deleteMaintenanceRecord(recordId);
            toast({ title: "Registro eliminado", description: "El registro de mantenimiento ha sido eliminado." });
            fetchRecords();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar el registro.", variant: "destructive" });
        }
    }

    const renderChecklist = (checklist: MaintenanceChecklistItem[]) => (
        <ul className="space-y-2 mt-4 columns-2">
            {checklist.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm break-inside-avoid">
                    {item.checked ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                    <span className={item.checked ? 'text-foreground' : 'text-muted-foreground'}>{item.name}</span>
                </li>
            ))}
        </ul>
    );

    if (loading) {
        return <Skeleton className="h-96 w-full" />;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-start sm:items-center justify-between">
                <div className="flex-grow">
                    <CardTitle className="font-headline">Historial de Mantenimiento</CardTitle>
                    <CardDescription>Servicios realizados en este móvil, del más reciente al más antiguo.</CardDescription>
                </div>
                 {canEdit && (
                    <AddMaintenanceRecordDialog vehicleId={vehicleId} onRecordAdded={onDataChange}>
                        <Button className="w-full sm:w-auto mt-4 sm:mt-0">
                            <PlusCircle className="mr-2" />
                            Registrar Servicio
                        </Button>
                    </AddMaintenanceRecordDialog>
                )}
            </CardHeader>
            <CardContent>
                {records.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {records.map(record => (
                            <AccordionItem key={record.id} value={record.id}>
                                <AccordionTrigger>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full pr-4 text-left">
                                        <div className="font-semibold text-base">{format(parseISO(record.date), 'PPP', { locale: es })}</div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <Gauge className="h-4 w-4"/> {record.mileage.toLocaleString('es-AR')} km
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="p-4 border-t bg-muted/50 rounded-b-lg">
                                        <div className="flex justify-end mb-2">
                                            {canEdit && (
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
                                                            <AlertDialogDescription>Esta acción es irreversible y eliminará el registro de mantenimiento del día {format(parseISO(record.date), 'P', { locale: es })}.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteRecord(record.id)} variant="destructive">Sí, eliminar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
                                            {record.nextServiceDate && (
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground"/>
                                                    <div>
                                                        <p className="font-medium">Próx. Servicio (Fecha):</p>
                                                        <p className="text-muted-foreground">{format(parseISO(record.nextServiceDate), 'PPP', { locale: es })}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {record.nextServiceMileage && record.nextServiceMileage > 0 && (
                                                 <div className="flex items-center gap-2">
                                                    <Gauge className="h-4 w-4 text-muted-foreground"/>
                                                    <div>
                                                        <p className="font-medium">Próx. Servicio (KM):</p>
                                                        <p className="text-muted-foreground">{record.nextServiceMileage.toLocaleString('es-AR')} km</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <h4 className="font-semibold mb-2">Checklist Realizado:</h4>
                                        {renderChecklist(record.checklist)}
                                        {record.observations && (
                                            <>
                                                <h4 className="font-semibold mt-4 mb-2">Observaciones:</h4>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.observations}</p>
                                            </>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No hay registros de mantenimiento para este móvil.</p>
                        {canEdit && <p className="text-sm text-muted-foreground mt-2">Use el botón "Registrar Servicio" para agregar el primero.</p>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
