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
      <PageHeader title="Firefighter Roster" description="Manage your department's firefighters.">
        <AddFirefighterDialog>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Firefighter
          </Button>
        </AddFirefighterDialog>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">All Firefighters</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Firehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
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
                      {firefighter.status}
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
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Deactivate</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className='text-destructive focus:text-destructive'>Delete</DropdownMenuItem>
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
