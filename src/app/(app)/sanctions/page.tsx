
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Sanction } from "@/lib/types";
import { getSanctions, deleteSanction } from "@/services/sanctions.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import AddSanctionDialog from "./_components/add-sanction-dialog";
import EditSanctionDialog from "./_components/edit-sanction-dialog";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";

export default function SanctionsPage() {
    const [sanctions, setSanctions] = useState<Sanction[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { getActiveRole } = useAuth();
    const pathname = usePathname();

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

    const fetchSanctions = async () => {
        setLoading(true);
        try {
            const data = await getSanctions();
            setSanctions(data);
        } catch (error) {
             toast({
                title: "Error",
                description: "No se pudieron cargar las sanciones.",
                variant: "destructive"
            })
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchSanctions();
    }, []);

    const handleDataChange = () => {
        fetchSanctions();
    };

    const handleDelete = async (sanction: Sanction) => {
        try {
            await deleteSanction(sanction.id);
            toast({
                title: "Éxito",
                description: "La sanción ha sido eliminada."
            });
            fetchSanctions();
        } catch (error: any) {
             toast({
                title: "Error",
                description: error.message || "No se pudo eliminar la sanción.",
                variant: "destructive"
            });
        }
    };


    return (
        <>
            <PageHeader title="Gestión de Sanciones" description="Registre y gestione las sanciones de los bomberos.">
                {canManage && (
                    <AddSanctionDialog onSanctionAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Registrar Sanción
                        </Button>
                    </AddSanctionDialog>
                )}
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Sanciones Registradas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Bombero</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead>Desde</TableHead>
                                <TableHead>Hasta</TableHead>
                                {canManage && <TableHead><span className="sr-only">Acciones</span></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    {canManage && <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>}
                                </TableRow>
                                ))
                            ) : (
                                sanctions.map((sanction) => (
                                    <TableRow key={sanction.id}>
                                        <TableCell className="font-medium">{sanction.firefighterName}</TableCell>
                                        <TableCell>{sanction.reason}</TableCell>
                                        <TableCell>{format(parseISO(sanction.startDate), "PPP", { locale: es })}</TableCell>
                                        <TableCell>{format(parseISO(sanction.endDate), "PPP", { locale: es })}</TableCell>
                                        {canManage && (
                                            <TableCell>
                                                 <AlertDialog>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">Toggle menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                            <EditSanctionDialog sanction={sanction} onSanctionUpdated={handleDataChange}>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    Editar
                                                                </DropdownMenuItem>
                                                            </EditSanctionDialog>
                                                            <DropdownMenuSeparator />
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem className='text-destructive focus:text-destructive' onSelect={(e) => e.preventDefault()}>
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Eliminar
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción no se puede deshacer. Esto eliminará permanentemente la sanción para <span className="font-semibold">{sanction.firefighterName}</span>.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(sanction)} variant="destructive">
                                                                Eliminar
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                     {sanctions.length === 0 && !loading && (
                        <div className="text-center text-muted-foreground py-16">
                            <p>No hay sanciones registradas.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
