
'use client';

import { useState, useEffect, useMemo } from 'react';
import { MaterialRequest, LoggedInUser, Vehicle } from '@/lib/types';
import { getPendingMaterialRequests, resolveMaterialRequest } from '@/services/material-requests.service';
import { getVehicles } from '@/services/vehicles.service';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, ArrowRight, Truck, Warehouse } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MaterialRequestsList({ onDataChange, actor }: { onDataChange: () => void, actor: LoggedInUser }) {
    const [requests, setRequests] = useState<MaterialRequest[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [requestsData, vehiclesData] = await Promise.all([
                getPendingMaterialRequests(),
                getVehicles()
            ]);
            setRequests(requestsData);
            setVehicles(vehiclesData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const vehicleMap = useMemo(() => {
        return new Map(vehicles.map(v => [v.id, v.numeroMovil]));
    }, [vehicles]);

    const handleResolve = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
        setResolvingId(requestId);
        try {
            await resolveMaterialRequest(requestId, status, actor);
            toast({ title: status === 'APPROVED' ? "Solicitud Aprobada" : "Solicitud Rechazada" });
            fetchAllData();
            onDataChange();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setResolvingId(null);
        }
    };

    const getUbicacionLabel = (ubicacion: any, cuartelFallback: string) => {
        if (!ubicacion) return 'N/A';
        if (ubicacion.type === 'vehiculo') {
            const movil = vehicleMap.get(ubicacion.vehiculoId);
            return movil ? `Móvil ${movil}` : `Móvil Desconocido`;
        }
        return `Dep. ${ubicacion.deposito || cuartelFallback || 'Sin asignar'}`;
    };

    const renderLocationInfo = (req: MaterialRequest) => {
        if (req.type === 'DELETE') return <Badge variant="destructive" className="font-bold">SOLICITUD DE BAJA</Badge>;
        
        const labelOld = getUbicacionLabel(req.originalData?.ubicacion, req.originalData?.cuartel);
        const labelNew = getUbicacionLabel(req.data?.ubicacion, req.data?.cuartel);

        return (
            <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground line-through bg-muted px-1.5 py-0.5 rounded">
                    {labelOld}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                    {labelNew}
                </span>
            </div>
        );
    };

    if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>;

    return (
        <Card className="shadow-md border-primary/10">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Solicitudes de Aprobación</CardTitle>
                <CardDescription>Revisiones de cambios solicitadas por los encargados de materiales de cada móvil.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Material</TableHead>
                            <TableHead>Solicitante</TableHead>
                            <TableHead>Cambio de Ubicación</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length > 0 ? requests.map(req => (
                            <TableRow key={req.id} className="hover:bg-muted/30">
                                <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {req.requestedAt ? format(parseISO(req.requestedAt), 'dd/MM HH:mm', { locale: es }) : 'N/A'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm">{req.materialNombre}</span>
                                        <span className="text-[10px] font-mono text-muted-foreground">{req.materialCodigo || 'Sin código'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs font-medium">{req.requestedByName}</TableCell>
                                <TableCell>{renderLocationInfo(req)}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0"
                                            onClick={() => handleResolve(req.id, 'REJECTED')}
                                            disabled={!!resolvingId}
                                            title="Rechazar"
                                        >
                                            <XCircle className="h-5 w-5" />
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                                            onClick={() => handleResolve(req.id, 'APPROVED')}
                                            disabled={!!resolvingId}
                                            title="Aprobar"
                                        >
                                            <CheckCircle2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                                    No hay solicitudes pendientes de revisión.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
