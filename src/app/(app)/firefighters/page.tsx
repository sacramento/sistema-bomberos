'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { firefighters } from '@/lib/data';
import { Firefighter } from '@/lib/types';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AddFirefighterDialog from './_components/add-firefighter-dialog';

export default function FirefightersPage() {
  return (
    <>
      <PageHeader title="Lista de Bomberos" description="Gestione los bomberos de su departamento.">
        <AddFirefighterDialog>
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
                <TableHead>Nombre</TableHead>
                <TableHead>Rango</TableHead>
                <TableHead>Estación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {firefighters.map((firefighter: Firefighter) => (
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
