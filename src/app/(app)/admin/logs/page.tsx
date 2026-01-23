
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuditLog, AuditLogAction } from "@/lib/types";
import { getLogs } from "@/services/audit.service";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

const translateLog = (log: AuditLog): string => {
    const { action, details } = log;

    const translations: { [key in AuditLogAction]?: (log: AuditLog) => string } = {
        // User
        LOGIN_SUCCESS: () => 'Inició sesión en el sistema.',
        LOGIN_FAILURE: () => 'Tuvo un intento de inicio de sesión fallido.',
        CREATE_USER: l => `Creó el usuario "${l.details?.name || l.targetId}".`,
        UPDATE_USER: l => `Actualizó el usuario "${l.details?.name || l.targetId}".`,
        DELETE_USER: l => `Eliminó el usuario con legajo "${l.details?.legajo || l.targetId}".`,
        
        // Firefighter
        CREATE_FIREFIGHTER: l => `Creó al bombero ${l.details?.firstName} ${l.details?.lastName}.`,
        UPDATE_FIREFIGHTER: l => `Actualizó los datos del bombero ${l.details?.firstName} ${l.details?.lastName}.`,
        DELETE_FIREFIGHTER: l => `Eliminó al bombero ${l.details?.firstName} ${l.details?.lastName}.`,
        BATCH_IMPORT_FIREFIGHTERS: l => `Importó ${l.details?.count} bomberos desde CSV.`,

        // Session
        CREATE_SESSION: l => `Creó la clase "${l.details?.title}".`,
        UPDATE_SESSION: l => `Actualizó la clase "${l.details?.title}".`,
        DELETE_SESSION: l => `Eliminó la clase "${l.details?.title}".`,
        
        // Workshop
        CREATE_WORKSHOP: l => `Creó el taller "${l.details?.title}".`,
        UPDATE_WORKSHOP: l => `Actualizó el taller "${l.details?.title}".`,
        DELETE_WORKSHOP: l => `Eliminó el taller "${l.details?.title}".`,

        UPDATE_ATTENDANCE: l => `Actualizó la asistencia para una clase o taller.`,

        // Leave, Sanction, Course
        CREATE_LEAVE: l => `Creó una licencia para ${l.details?.firefighterName}.`,
        UPDATE_LEAVE: l => `Actualizó la licencia de ${l.details?.firefighterName}.`,
        DELETE_LEAVE: l => `Eliminó la licencia de ${l.details?.firefighterName}.`,
        CREATE_SANCTION: l => `Creó una sanción para ${l.details?.firefighterName}.`,
        UPDATE_SANCTION: l => `Actualizó la sanción de ${l.details?.firefighterName}.`,
        DELETE_SANCTION: l => `Eliminó la sanción de ${l.details?.firefighterName}.`,
        CREATE_COURSE: l => `Creó el curso "${l.details?.title}" para ${l.details?.firefighterName}.`,
        UPDATE_COURSE: l => `Actualizó el curso "${l.details?.title}" de ${l.details?.firefighterName}.`,
        DELETE_COURSE: l => `Eliminó el registro de curso de ${l.details?.firefighterName}.`,
        BATCH_CREATE_COURSES: l => `Creó ${l.details?.count || 'varios'} registros de cursos en lote.`,

        // Week & Task
        CREATE_WEEK: l => `Creó la semana "${l.details?.name}".`,
        UPDATE_WEEK: l => `Actualizó la semana "${l.details?.name}".`,
        DELETE_WEEK: l => `Eliminó la semana "${l.details?.name}".`,
        CREATE_TASK: l => `Creó la tarea "${l.details?.title}".`,
        UPDATE_TASK: l => `Actualizó la tarea "${l.details?.title}".`,
        DELETE_TASK: l => `Eliminó la tarea "${l.details?.title}".`,
        
        // Vehicle
        CREATE_VEHICLE: l => `Creó el móvil "${l.details?.numeroMovil}".`,
        UPDATE_VEHICLE: l => `Actualizó el móvil "${l.details?.numeroMovil}".`,
        DELETE_VEHICLE: l => `Eliminó el móvil "${l.details?.numeroMovil}".`,

        // Maintenance
        CREATE_MAINTENANCE_ITEM: l => `Creó el ítem de checklist "${l.details?.name}".`,
        UPDATE_MAINTENANCE_ITEM: l => `Actualizó el ítem de checklist "${l.details?.name}".`,
        DELETE_MAINTENANCE_ITEM: l => `Eliminó el ítem de checklist "${l.details?.name}".`,
        CREATE_MAINTENANCE_RECORD: l => `Registró un mantenimiento para un móvil.`,
        DELETE_MAINTENANCE_RECORD: l => `Eliminó un registro de mantenimiento.`,
        CREATE_REPAIR_RECORD: l => `Registró una reparación para un móvil.`,
        DELETE_REPAIR_RECORD: l => `Eliminó un registro de reparación.`,
        
        // Spare Part
        CREATE_SPARE_PART: l => `Agregó el repuesto "${l.details?.name}".`,
        UPDATE_SPARE_PART: l => `Actualizó el repuesto "${l.details?.name}".`,
        DELETE_SPARE_PART: l => `Eliminó el repuesto "${l.details?.name}".`,

        // Material
        CREATE_MATERIAL: l => `Creó el material "${l.details?.nombre}".`,
        UPDATE_MATERIAL: l => `Actualizó el material "${l.details?.nombre}".`,
        DELETE_MATERIAL: l => `Eliminó el material "${l.details?.nombre}".`,
        BATCH_IMPORT_MATERIALS: l => `Importó ${l.details?.count} materiales desde CSV.`,

        // Clothing
        CREATE_CLOTHING_ITEM: l => `Creó la prenda "${l.details?.type}" (código: ${l.details?.code}).`,
        UPDATE_CLOTHING_ITEM: l => `Actualizó la prenda con código "${l.details?.code}".`,
        DELETE_CLOTHING_ITEM: l => `Eliminó la prenda con código "${l.details?.code}".`,
        BATCH_IMPORT_CLOTHING: l => `Importó ${l.details?.count} prendas desde CSV.`,

        // General Inventory
        CREATE_GENERAL_INVENTORY_ITEM: l => `Creó el ítem de inventario "${l.details?.nombre}".`,
        UPDATE_GENERAL_INVENTORY_ITEM: l => `Actualizó el ítem "${l.details?.nombre}".`,
        DELETE_GENERAL_INVENTORY_ITEM: l => `Eliminó el ítem "${l.details?.nombre}".`,

        // Driver
        CREATE_DRIVER: l => `Agregó a un bombero como chofer.`,
        UPDATE_DRIVER: l => `Actualizó las habilitaciones de un chofer.`,
        DELETE_DRIVER: l => `Eliminó un chofer de la lista.`,

        // Service
        CREATE_SERVICE: l => `Registró un nuevo servicio.`,
        UPDATE_SERVICE: l => `Actualizó un servicio.`,
        DELETE_SERVICE: l => `Eliminó un servicio.`,
        
        // Cascade
        CREATE_CASCADE_CHARGE: l => `Registró una carga de cascada para el tubo ${l.details?.materialCode}.`,
        CREATE_CASCADE_SYSTEM_CHARGE: l => `Registró una carga del sistema de cascada para los tubos: ${l.details?.tubes?.join(', ')}.`,
    };

    const translator = translations[action];
    return translator ? translator(log) : `Realizó la acción: ${action}`;
};


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
                                <TableHead>Descripción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 10 }).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : logs.length > 0 ? (
                                logs.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell className="whitespace-nowrap">{log.timestamp ? format(new Date(log.timestamp), 'Pp', { locale: es }) : 'N/A'}</TableCell>
                                        <TableCell className="font-medium">{log.userName}</TableCell>
                                        <TableCell>{translateLog(log)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
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
