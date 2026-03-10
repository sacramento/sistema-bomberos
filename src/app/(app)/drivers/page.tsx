
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Firefighter, Driver, Habilitacion } from "@/lib/types";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo } from 'react';
import { getDrivers, deleteDriver } from "@/services/drivers.service";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import AddDriverDialog from "./_components/add-driver-dialog";
import EditDriverDialog from "./_components/edit-driver-dialog";

const habilitacionColors: Record<Habilitacion, string> = {
    'Practica': 'bg-blue-500',
    'Liviana': 'bg-green-500',
    'Pesada': 'bg-red-500',
    'Timonel': 'bg-cyan-500',
};

const getCuartelBadgeClass = (cuartel: Firefighter['firehouse'] | undefined) => {
    if (!cuartel) return 'bg-secondary text-secondary-foreground';
    switch (cuartel) {
        case 'Cuartel 1': return 'bg-yellow-500 text-black hover:bg-yellow-500/90';
        case 'Cuartel 2': return 'bg-blue-500 text-white hover:bg-blue-500/90';
        case 'Cuartel 3': return 'bg-green-600 text-white hover:bg-green-600/90';
        default: return 'bg-secondary text-secondary-foreground';
    }
}


export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { getActiveRole, user: actor } = useAuth();
  const pathname = usePathname();

  const activeRole = getActiveRole(pathname);
  const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const data = await getDrivers();
      setDrivers(data);
    } catch (error) {
       toast({
        title: "Error",
        description: "No se pudieron cargar los choferes.",
        variant: "destructive"
      })
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleDataChange = () => {
    fetchDrivers();
  };

  const handleDelete = async (driverId: string) => {
    if (!actor) return;
    try {
        await deleteDriver(driverId, actor);
        toast({
            title: "Éxito",
            description: "El chofer ha sido eliminado."
        });
        fetchDrivers();
    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message || "No se pudo eliminar el chofer.",
            variant: "destructive"
        });
    }
  };

    const summary = useMemo(() => {
    const counts = {
      'Cuartel 1': 0,
      'Cuartel 2': 0,
      'Cuartel 3': 0,
      'Otros': 0,
    };
    drivers.forEach(driver => {
      const firehouse = driver.firefighter?.firehouse;
      if (firehouse === 'Cuartel 1' || firehouse === 'Cuartel 2' || firehouse === 'Cuartel 3') {
        counts[firehouse]++;
      } else if (firehouse) {
        counts['Otros']++;
      }
    });
    return counts;
  }, [drivers]);

  return (
    <>
      <PageHeader title="Gestión de Choferes" description="Listado de todo el personal habilitado para conducir.">
        {canManage && (
            <AddDriverDialog onDriverAdded={handleDataChange}>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Chofer
                </Button>
            </AddDriverDialog>
        )}
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Choferes Cuartel 1</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{summary['Cuartel 1']}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Choferes Cuartel 2</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{summary['Cuartel 2']}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Choferes Cuartel 3</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{summary['Cuartel 3']}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Choferes</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{drivers.length}</div></CardContent>
            </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Choferes Habilitados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Legajo</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Rango</TableHead>
                <TableHead>Cuartel</TableHead>
                <TableHead>Habilitaciones</TableHead>
                {canManage && (
                    <TableHead>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    {canManage && <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>}
                  </TableRow>
                ))
              ) : (
                drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.firefighter?.legajo}</TableCell>
                    <TableCell>{driver.firefighter ? `${driver.firefighter.legajo} - ${driver.firefighter.lastName}, ${driver.firefighter.firstName}` : 'N/A'}</TableCell>
                    <TableCell>{driver.firefighter?.rank}</TableCell>
                    <TableCell>
                        <Badge className={cn(getCuartelBadgeClass(driver.firefighter?.firehouse))}>{driver.firefighter?.firehouse}</Badge>
                    </TableCell>
                    <TableCell>
                        <div className="flex gap-2">
                            {driver.habilitaciones.map(h => (
                                <Badge key={h} className={cn(habilitacionColors[h], 'text-white')}>{h}</Badge>
                            ))}
                        </div>
                    </TableCell>
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
                                <EditDriverDialog driver={driver} onDriverUpdated={handleDataChange}>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Edit className="mr-2 h-4 w-4"/> Editar
                                    </DropdownMenuItem>
                                </EditDriverDialog>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className='text-destructive focus:text-destructive' onSelect={(e) => e.preventDefault()}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                            </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará a <span className="font-semibold">{`${driver.firefighter?.firstName} ${driver.firefighter?.lastName}`}</span> de la lista de choferes.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(driver.id)} variant="destructive">
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
           {drivers.length === 0 && !loading && (
                <div className="text-center text-muted-foreground py-16">
                    <p>No hay choferes registrados.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </>
  );
}
