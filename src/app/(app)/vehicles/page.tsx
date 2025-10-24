
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Vehicle } from "@/lib/types";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo } from 'react';
import { getVehicles, deleteVehicle } from "@/services/vehicles.service";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import AddVehicleDialog from "./_components/add-vehicle-dialog";
import EditVehicleDialog from "./_components/edit-vehicle-dialog";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const getCuartelBadgeClass = (cuartel: Vehicle['cuartel']) => {
    switch (cuartel) {
        case 'Deposito C1': return 'bg-yellow-500 text-black hover:bg-yellow-500/90';
        case 'Deposito C2': return 'bg-blue-500 text-white hover:bg-blue-500/90';
        case 'Deposito C3': return 'bg-green-600 text-white hover:bg-green-600/90';
        default: return 'bg-secondary text-secondary-foreground';
    }
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, getActiveRole } = useAuth();
  const pathname = usePathname();

  const activeRole = getActiveRole(pathname);
  const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await getVehicles();
      setVehicles(data);
    } catch (error) {
       toast({
        title: "Error",
        description: "No se pudieron cargar los móviles.",
        variant: "destructive"
      })
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleDataChange = () => {
    fetchVehicles();
  };

  const handleDelete = async (vehicleId: string) => {
    try {
        await deleteVehicle(vehicleId);
        toast({
            title: "Éxito",
            description: "El móvil ha sido eliminado."
        });
        fetchVehicles();
    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message || "No se pudo eliminar el móvil.",
            variant: "destructive"
        });
    }
  };

  const canEditVehicle = (vehicle: Vehicle) => {
      if (canManage) return true;
      if (activeRole === 'Encargado Móvil' && user?.id && vehicle.encargadoIds?.includes(user.id)) return true;
      return false;
  }

  const renderEncargados = (vehicle: Vehicle) => {
    if (!vehicle.encargados || vehicle.encargados.length === 0) {
        return 'Sin asignar';
    }
    const firstEncargado = vehicle.encargados[0];
    const remainingCount = vehicle.encargados.length - 1;

    if (remainingCount > 0) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="cursor-pointer">
                            {`${firstEncargado.lastName}, +${remainingCount}`}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <ul className="list-disc pl-4">
                            {vehicle.encargados.map(e => <li key={e.id}>{`${e.firstName} ${e.lastName}`}</li>)}
                        </ul>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    return firstEncargado.lastName;
  }

  return (
    <>
      <PageHeader title="Gestión de Flota Vehicular" description="Registre y administre todos los móviles del departamento.">
        {canManage && (
            <AddVehicleDialog onVehicleAdded={handleDataChange}>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Móvil
                </Button>
            </AddVehicleDialog>
        )}
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Todos los Móviles</CardTitle>
          <CardDescription>Listado completo de la flota vehicular.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Móvil Nº</TableHead>
                <TableHead>Marca y Modelo</TableHead>
                <TableHead className="hidden md:table-cell">Depósito</TableHead>
                <TableHead className="hidden lg:table-cell">Encargado(s)</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : (
                vehicles.map((vehicle: Vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">
                        <Button variant="link" asChild className="p-0 h-auto">
                            <Link href={`/vehicles/${vehicle.id}`}>
                                {vehicle.numeroMovil}
                            </Link>
                        </Button>
                    </TableCell>
                    <TableCell>{`${vehicle.marca} ${vehicle.modelo}`}</TableCell>
                    <TableCell className="hidden md:table-cell">
                        <Badge className={cn(getCuartelBadgeClass(vehicle.cuartel))}>{vehicle.cuartel}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{renderEncargados(vehicle)}</TableCell>
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
                                {canEditVehicle(vehicle) && (
                                     <EditVehicleDialog vehicle={vehicle} onVehicleUpdated={handleDataChange}>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Editar
                                        </DropdownMenuItem>
                                    </EditVehicleDialog>
                                )}
                                {canManage && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem className='text-destructive focus:text-destructive' onSelect={(e) => e.preventDefault()}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Eliminar
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                    </>
                                )}
                            </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el móvil <span className="font-semibold">{vehicle.numeroMovil}</span>.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(vehicle.id)} variant="destructive">
                                    Eliminar
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
            {vehicles.length === 0 && !loading && (
                <div className="text-center text-muted-foreground py-16">
                    <p>No hay móviles registrados. Use el botón "Agregar Móvil" para empezar.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </>
  );
}
