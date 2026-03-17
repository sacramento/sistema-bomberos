'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState, useMemo } from "react";
import { DutyCheck, Week } from "@/lib/types";
import { getDutyChecks } from "@/services/duty-checks.service";
import { getWeeks } from "@/services/weeks.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { PlusCircle, Eye, AlertTriangle, CheckCircle2, History, ClipboardCheck, Loader2, Calendar, Building2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import AddDutyCheckDialog from "./_components/add-duty-check-dialog";
import DutyCheckDetailsDialog from "./_components/duty-check-details-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type DutyCheckBatch = {
    id: string;
    date: string;
    weekId: string;
    weekName: string;
    cuartel: string;
    inspectorName: string;
    checks: DutyCheck[];
};

export default function DutyChecksPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [checks, setChecks] = useState<DutyCheck[]>([]);
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState<DutyCheckBatch | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [checksData, weeksData] = await Promise.all([
                getDutyChecks(),
                getWeeks()
            ]);
            setChecks(checksData);
            setWeeks(weeksData);
        } catch (error) {
            toast({ title: "Error al cargar", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const groupedBatches = useMemo(() => {
        const groups: Record<string, DutyCheckBatch> = {};
        const weekMap = new Map(weeks.map(w => [w.id, w.name]));

        checks.forEach(check => {
            const key = `${check.date}_${check.weekId}_${check.cuartel}`;
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    date: check.date,
                    weekId: check.weekId,
                    weekName: weekMap.get(check.weekId) || 'Semana s/n',
                    cuartel: check.cuartel,
                    inspectorName: check.inspectorName,
                    checks: []
                };
            }
            groups[key].checks.push(check);
        });

        return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    }, [checks, weeks]);

    const handleViewBatchDetails = (batch: DutyCheckBatch) => {
        // Since the details dialog expects one check, but we have a batch, 
        // we'll consolidate the batch into one "virtual" check for display purposes.
        const consolidatedCheck: DutyCheck = {
            ...batch.checks[0],
            vehicleId: batch.checks.map(c => c.vehicleId.split('-')[0]).join(', '),
            vehicleChecks: batch.checks.flatMap(c => c.vehicleChecks.map(vc => ({...vc, name: `[Móv ${c.vehicleId.split('-')[0]}] ${vc.name}`}))),
            equipmentChecks: batch.checks.flatMap(c => c.equipmentChecks.map(ec => ({...ec, name: `[Móv ${c.vehicleId.split('-')[0]}] ${ec.name}`}))),
        };
        setSelectedBatch({ ...batch, checks: [consolidatedCheck] });
        setDetailsOpen(true);
    };

    return (
        <>
            <PageHeader title="Control de Guardia" description="Registro semanal de operatividad de móviles y materiales.">
                <AddDutyCheckDialog onCheckAdded={fetchData} actor={user}>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuevo Control de Dotación
                    </Button>
                </AddDutyCheckDialog>
            </PageHeader>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <History className="h-5 w-5 text-muted-foreground" /> Inspecciones Realizadas
                        </CardTitle>
                        <CardDescription>Resumen de controles por jornada y cuartel.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Semana / Cuartel</TableHead>
                                    <TableHead>Unidades Controladas</TableHead>
                                    <TableHead>Encargado</TableHead>
                                    <TableHead>Novedades</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                    ))
                                ) : groupedBatches.length > 0 ? (
                                    groupedBatches.map(batch => {
                                        const totalFails = batch.checks.reduce((acc, c) => 
                                            acc + c.vehicleChecks.filter(vc => vc.status === 'FALLA').length + 
                                            c.equipmentChecks.filter(ec => ec.status === 'FALLA').length, 0);
                                        
                                        return (
                                            <TableRow key={batch.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                                        {format(parseISO(batch.date), 'P', { locale: es })}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold">{batch.weekName}</span>
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Building2 className="h-2 w-2"/> {batch.cuartel}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {batch.checks.map(c => (
                                                            <Badge key={c.id} variant="outline" className="text-[10px] px-1.5 py-0">
                                                                Móvil {c.vehicleId.split('-')[0]}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">{batch.inspectorName}</TableCell>
                                                <TableCell>
                                                    {totalFails > 0 ? (
                                                        <Badge variant="destructive" className="gap-1">
                                                            <AlertTriangle className="h-3 w-3" /> {totalFails} Fallas
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-green-600 gap-1">
                                                            <CheckCircle2 className="h-3 w-3" /> OK
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => handleViewBatchDetails(batch)}>
                                                        <Eye className="h-4 w-4 mr-2" /> Ver Informe
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                                            Aún no se han registrado controles de guardia.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <DutyCheckDetailsDialog 
                check={selectedBatch?.checks[0] || null} 
                open={detailsOpen} 
                onOpenChange={setDetailsOpen} 
            />
        </>
    );
}
