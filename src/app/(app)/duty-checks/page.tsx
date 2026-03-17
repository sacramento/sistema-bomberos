
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { DutyCheck } from "@/lib/types";
import { getDutyChecks } from "@/services/duty-checks.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { PlusCircle, Eye, AlertTriangle, CheckCircle2, History, ClipboardCheck, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import AddDutyCheckDialog from "./_components/add-duty-check-dialog";
import DutyCheckDetailsDialog from "./_components/duty-check-details-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function DutyChecksPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [checks, setChecks] = useState<DutyCheck[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCheck, setSelectedCheck] = useState<DutyCheck | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const fetchChecks = async () => {
        setLoading(true);
        try {
            const data = await getDutyChecks();
            setChecks(data);
        } catch (error) {
            toast({ title: "Error al cargar", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChecks();
    }, []);

    const handleViewDetails = (check: DutyCheck) => {
        setSelectedCheck(check);
        setDetailsOpen(true);
    };

    return (
        <>
            <PageHeader title="Control de Guardia" description="Registro semanal de operatividad de móviles y materiales.">
                <AddDutyCheckDialog onCheckAdded={fetchChecks} actor={user}>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuevo Control
                    </Button>
                </AddDutyCheckDialog>
            </PageHeader>

            <div className="grid gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <History className="h-5 w-5 text-muted-foreground" /> Controles Recientes
                            </CardTitle>
                            <CardDescription>Visualice los últimos chequeos realizados por los encargados.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Cuartel</TableHead>
                                    <TableHead>Móvil</TableHead>
                                    <TableHead>Encargado</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                    ))
                                ) : checks.length > 0 ? (
                                    checks.map(check => {
                                        const totalFails = check.vehicleChecks.filter(c => c.status === 'FALLA').length + 
                                                         check.equipmentChecks.filter(c => c.status === 'FALLA').length;
                                        return (
                                            <TableRow key={check.id}>
                                                <TableCell className="font-medium">{format(parseISO(check.date), 'P', { locale: es })}</TableCell>
                                                <TableCell>{check.cuartel}</TableCell>
                                                <TableCell className="font-bold">Móvil {check.vehicleId.split('-')[0]}</TableCell>
                                                <TableCell className="text-xs">{check.inspectorName}</TableCell>
                                                <TableCell>
                                                    {totalFails > 0 ? (
                                                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                                            <AlertTriangle className="h-3 w-3" /> {totalFails} Novedades
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-green-600 flex items-center gap-1 w-fit">
                                                            <CheckCircle2 className="h-3 w-3" /> Sin fallas
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => handleViewDetails(check)}>
                                                        <Eye className="h-4 w-4 mr-2" /> Ver Detalle
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
                check={selectedCheck} 
                open={detailsOpen} 
                onOpenChange={setDetailsOpen} 
            />
        </>
    );
}
