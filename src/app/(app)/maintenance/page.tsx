
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MaintenanceItem } from "@/lib/types";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
import { useEffect, useState, useMemo } from 'react';
import { getMaintenanceItems, deleteMaintenanceItem } from "@/services/maintenance-items.service";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import AddMaintenanceItemDialog from "./_components/add-maintenance-item-dialog";
import EditMaintenanceItemDialog from "./_components/edit-maintenance-item-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function MaintenanceItemsPage() {
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { getActiveRole } = useAuth();
  const pathname = usePathname();

  const activeRole = getActiveRole(pathname);
  const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getMaintenanceItems();
      setItems(data);
    } catch (error) {
       toast({
        title: "Error",
        description: "No se pudieron cargar los ítems de mantenimiento.",
        variant: "destructive"
      })
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDataChange = () => {
    fetchItems();
  };

  const handleDelete = async (itemId: string) => {
    try {
        await deleteMaintenanceItem(itemId);
        toast({
            title: "Éxito",
            description: "El ítem de mantenimiento ha sido eliminado."
        });
        fetchItems();
    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message || "No se pudo eliminar el ítem.",
            variant: "destructive"
        });
    }
  };

  if (!canManage) {
    return (
        <>
            <PageHeader title="Mantenimiento" description="Acceso no autorizado." />
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Permiso Denegado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>No tiene los permisos necesarios para gestionar los ítems de mantenimiento.</p>
                </CardContent>
            </Card>
        </>
    )
  }

  return (
    <>
      <PageHeader title="Configuración de Mantenimiento" description="Gestione los ítems que aparecerán en el checklist de cada servicio.">
        <AddMaintenanceItemDialog onItemAdded={handleDataChange}>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Ítem
            </Button>
        </AddMaintenanceItemDialog>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Lista Maestra de Ítems del Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Ítem</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : (
                items.map((item: MaintenanceItem) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
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
                                <EditMaintenanceItemDialog item={item} onItemUpdated={handleDataChange}>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Edit className="mr-2 h-4 w-4"/>
                                        Editar
                                    </DropdownMenuItem>
                                </EditMaintenanceItemDialog>
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
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el ítem <span className="font-semibold">{item.name}</span> de la lista.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)} variant="destructive">
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
           {items.length === 0 && !loading && (
                <div className="text-center text-muted-foreground py-16">
                    <p>No hay ítems de mantenimiento registrados.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </>
  );
}
