
'use client';

import { useState, useEffect } from 'react';
import { MaterialRequest, LoggedInUser } from '@/lib/types';
import { getPendingMaterialRequests, resolveMaterialRequest } from '@/services/material-requests.service';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, ArrowRight, Truck, Warehouse, Trash2, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MaterialRequestsList({ onDataChange, actor }: { onDataChange: () => void, actor: LoggedInUser }) {
    const [requests, setRequests] = useState<MaterialRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await getPendingMaterialRequests();
            setRequests(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleResolve = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
        setResolvingId(requestId);
        try {
            await resolveMaterialRequest(requestId, status, actor);
            toast({ title: status === 'APPROVED' ? "Solicitud Aprobada" : "Solicitud Rechazada" });
            fetchRequests();
            onDataChange();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setResolvingId(null);
        }
    };

    const renderLocationInfo = (req: MaterialRequest) => {
        if (req.type === 'DELETE') return <Badge variant="destructive">SOLICITUD DE BAJA</Badge>;
        
        const oldLoc = req.originalData?.ubicacion;
        const newLoc = req.data?.ubicacion;

        return (
            <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground line-through">
                    {oldLoc?.type === 'vehiculo' ? `Mov ${oldLoc.vehiculoId}` : `Dep ${req.originalData?.cuartel}`}
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-bold text-primary">
                    {newLoc?.type === 'vehiculo' ? `Mov ${newLoc.vehiculoId}` : `Dep ${req.data?.cuartel}`}
                </span>
            </div>
        );
    };

    if (loading) return <Skeleton className="h-64 w-full" />;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Solicitudes Pendientes</CardTitle>
                <CardDescription>Revisiones de cambios solicitadas por los encargados de materiales.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Material</TableHead>
                            <TableHead>Solicitante</TableHead>
                            <TableHead>Tipo/Cambio</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length > 0 ? requests.map(req => (
                            <TableRow key={req.id}>
                                <TableCell className="text-xs">{format(parseISO(req.requestedAt), 'dd/MM HH:mm', { locale: es })}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{req.materialNombre}</span>
                                        <span className="text-[10px] font-mono">{req.materialCodigo}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs">{req.requestedByName}</TableCell>
                                <TableCell>{renderLocationInfo(req)}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                            onClick={() => handleResolve(req.id, 'REJECTED')}
                                            disabled={!!resolvingId}
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => handleResolve(req.id, 'APPROVED')}
                                            disabled={!!resolvingId}
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
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
