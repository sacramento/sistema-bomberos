'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Firefighter } from '@/lib/types';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AddFirefighterDialog from './_components/add-firefighter-dialog';
import { useEffect, useState } from 'react';
import { getFirefighters } from '@/services/firefighters.service';
import { Skeleton } from '@/components/ui/skeleton';

export default function FirefightersPage() {
  const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFirefighters = async () => {
    setLoading(true);
    const data = await getFirefighters();
    setFirefighters(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchFirefighters();
  }, []);

  const handleFirefighterAdded = () => {
    // Re-fetch firefighters after one is added
    fetchFirefighters();
  };

  return (
    <>
      <PageHeader title="Lista de Bomberos" description="Gestione los bomberos de su departamento.">
        <AddFirefighterDialog onFirefighterAdded={handleFirefighterAdded}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Agregar Bombero
          </Button>
        </AddFirefighterDialog>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Todos los Bomberos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Rango</TableHead>
                <TableHead>Cuartel</TableHead>
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
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : (
                firefighters.map((firefighter: Firefighter) => (
                  <TableRow key={firefighter.id}>
                    <TableCell className="font-medium">{firefighter.id}</TableCell>
                    <TableCell>{firefighter.name}</TableCell>
                    <TableCell>{firefighter.rank}</TableCell>
                    <TableCell>{firefighter.firehouse}</TableCell>
                    <TableCell>
                      <Badge variant={firefighter.status === 'Active' ? 'default' : 'destructive'} className={firefighter.status === 'Active' ? 'bg-green-600' : ''}>
                        {firefighter.status === 'Active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuItem>Desactivar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className='text-destructive focus:text-destructive'>Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
