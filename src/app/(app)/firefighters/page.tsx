'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Firefighter } from '@/lib/types';
import { MoreHorizontal, PlusCircle, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AddFirefighterDialog from './_components/add-firefighter-dialog';
import { useEffect, useState, useMemo } from 'react';
import { deleteFirefighter, getFirefighters } from '@/services/firefighters.service';
import { Skeleton } from '@/components/ui/skeleton';
import ImportCsvDialog from './_components/import-csv-dialog';
import EditFirefighterDialog from './_components/edit-firefighter-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function FirefightersPage() {
  const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFirefighters = async () => {
    setLoading(true);
    try {
      const data = await getFirefighters();
      setFirefighters(data);
    } catch (error) {
       toast({
        title: "Error",
        description: "No se pudieron cargar los bomberos.",
        variant: "destructive"
      })
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirefighters();
  }, []);
  
  const sortedFirefighters = useMemo(() => {
    return [...firefighters].sort((a, b) => (a.legajo || '').localeCompare(b.legajo || ''));
  }, [firefighters]);

  const handleDataChange = () => {
    // Re-fetch firefighters after one is added, imported, edited, or deleted
    fetchFirefighters();
  };

  const handleDelete = async (firefighterId: string) => {
    try {
        await deleteFirefighter(firefighterId);
        toast({
            title: "Éxito",
            description: "El bombero ha sido eliminado."
        });
        fetchFirefighters();
    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message || "No se pudo eliminar el bombero.",
            variant: "destructive"
        });
    }
  };

  return (
    <>
      <PageHeader title="Lista de Bomberos" description="Gestione los bomberos de su departamento.">
        <div className="flex flex-col sm:flex-row gap-2">
            <ImportCsvDialog onImportSuccess={handleDataChange}>
                <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Importar CSV
                </Button>
            </ImportCsvDialog>
            <AddFirefighterDialog onFirefighterAdded={handleDataChange}>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Bombero
            </Button>
            </AddFirefighterDialog>
        </div>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Todos los Bomberos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Legajo</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead className="hidden md:table-cell">Rango</TableHead>
                <TableHead className="hidden sm:table-cell">Cuartel</TableHead>
                <TableHead>Estado</TableHead>
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
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : (
                sortedFirefighters.map((firefighter: Firefighter) => (
                  <TableRow key={firefighter.id || firefighter.legajo}>
                    <TableCell className="font-medium">{firefighter.legajo}</TableCell>
                    <TableCell>{`${firefighter.firstName} ${firefighter.lastName}`}</TableCell>
                    <TableCell className="hidden md:table-cell">{firefighter.rank}</TableCell>
                    <TableCell className="hidden sm:table-cell">{firefighter.firehouse}</TableCell>
                    <TableCell>
                      <Badge variant={firefighter.status === 'Active' ? 'default' : 'destructive'} className={firefighter.status === 'Active' ? 'bg-green-600' : ''}>
                        {firefighter.status === 'Active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
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
                            <EditFirefighterDialog firefighter={firefighter} onFirefighterUpdated={handleDataChange}>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    Editar
                                </DropdownMenuItem>
                            </EditFirefighterDialog>
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
                                Esta acción no se puede deshacer. Esto eliminará permanentemente al bombero <span className="font-semibold">{`${firefighter.firstName} ${firefighter.lastName}`}</span>.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(firefighter.id)} variant="destructive">
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
        </CardContent>
      </Card>
    </>
  );
}
