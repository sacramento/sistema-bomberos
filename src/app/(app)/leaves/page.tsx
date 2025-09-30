
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Leave } from "@/lib/types";
import { getLeaves, deleteLeave } from "@/services/leaves.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import AddLeaveDialog from "./_components/add-leave-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import EditLeaveDialog from "./_components/edit-leave-dialog";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";

export default function LeavesPage() {
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { getActiveRole } = useAuth();
    const pathname = usePathname();

    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Ayudantía', [activeRole]);

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const data = await getLeaves();
            setLeaves(data);
        } catch (error) {
             toast({
                title: "Error",
                description: "No se pudieron cargar las licencias.",
                variant: "destructive"
            })
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchLeaves();
    }, []);

    const handleDataChange = () => {
        fetchLeaves();
    };

    const handleDelete = async (leaveId: string) => {
        try {
            await deleteLeave(leaveId);
            toast({
                title: "Éxito",
                description: "La licencia ha sido eliminada."
            });
            fetchLeaves();
        } catch (error: any) {
             toast({
                title: "Error",
                description: error.message || "No se pudo eliminar la licencia.",
                variant: "destructive"
            });
        }
    };


    return (
        <>
            <PageHeader title="Gestión de Licencias" description="Registre y gestione las licencias de los bomberos.">
                {canManage && (
                    <AddLeaveDialog onLeaveAdded={handleDataChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Registrar Licencia
                        </Button>
                    </AddLeaveDialog>
                )}
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Licencias Registradas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Bombero</TableHead>
                                <TableHead>Tipo de Licencia</TableHead>
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
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    {canManage && <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>}
                                </TableRow>
                                ))
                            ) : (
                                leaves.map((leave) => (
                                    <TableRow key={leave.id}>
                                        <TableCell className="font-medium">{leave.firefighterName}</TableCell>
                                        <TableCell>{leave.type}</TableCell>
                                        <TableCell>{format(new Date(leave.startDate), "PPP", { locale: es })}</TableCell>
                                        <TableCell>{format(new Date(leave.endDate), "PPP", { locale: es })}</TableCell>
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
                                                            <EditLeaveDialog leave={leave} onLeaveUpdated={handleDataChange}>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    Editar
                                                                </DropdownMenuItem>
                                                            </EditLeaveDialog>
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
                                                                Esta acción no se puede deshacer. Esto eliminará permanentemente la licencia para <span className="font-semibold">{leave.firefighterName}</span>. 
                                                                Esta acción NO revierte las justificaciones de asistencia ya realizadas.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(leave.id)} variant="destructive">
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
                     {leaves.length === 0 && !loading && (
                        <div className="text-center text-muted-foreground py-16">
                            <p>No hay licencias registradas.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
