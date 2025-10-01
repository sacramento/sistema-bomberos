
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuditLog } from "@/lib/types";
import { getLogs } from "@/services/audit.service";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const data = await getLogs();
                setLogs(data);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "No se pudo cargar la bitácora.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [toast]);

    return (
        <>
            <PageHeader title="Bitácora de Auditoría" description="Registro de todas las acciones importantes realizadas en el sistema." />
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Registros del Sistema</CardTitle>
                    <CardDescription>Mostrando los últimos 100 eventos, de más reciente a más antiguo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha y Hora</TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Acción</TableHead>
                                <TableHead>Entidad Afectada</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 10 }).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                    </TableRow>
                                ))
                            ) : logs.length > 0 ? (
                                logs.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell>{log.timestamp ? format(log.timestamp.toDate(), 'Pp', { locale: es }) : 'N/A'}</TableCell>
                                        <TableCell>{log.userName} ({log.userId})</TableCell>
                                        <TableCell><Badge variant="secondary">{log.action}</Badge></TableCell>
                                        <TableCell>{log.targetEntity}: {log.targetId}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No hay registros en la bitácora.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    )
}
