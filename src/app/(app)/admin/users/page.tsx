'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteUser, getUsers } from "@/services/users.service";
import { User } from "@/lib/types";
import { MoreHorizontal, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import AddUserDialog from "./_components/add-user-dialog";
import EditUserDialog from "./_components/edit-user-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudieron cargar los usuarios.",
                variant: "destructive"
            })
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUserChange = () => {
        fetchUsers();
    };

    const handleDelete = async (userId: string) => {
        try {
            await deleteUser(userId);
            toast({
                title: "Éxito",
                description: "El usuario ha sido eliminado."
            });
            fetchUsers();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "No se pudo eliminar el usuario.",
                variant: "destructive"
            });
        }
    };

    return (
        <>
            <PageHeader title="Administración de Usuarios" description="Gestionar cuentas de usuario y roles.">
                 <AddUserDialog onUserAdded={handleUserChange}>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Usuario
                    </Button>
                 </AddUserDialog>
            </PageHeader>
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Todos los Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="hidden sm:table-cell">Legajo</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Rol Global</TableHead>
                        <TableHead className="hidden md:table-cell">Roles Modulares</TableHead>
                        <TableHead>
                        <span className="sr-only">Acciones</span>
                        </TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={index}>
                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                        </TableRow>
                        ))
                    ) : (
                        users.map((user: User) => (
                        <TableRow key={user.id}>
                            <TableCell className="hidden sm:table-cell font-medium">{user.id}</TableCell>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>
                                <Badge variant={user.role === 'Administrador' ? 'destructive' : 'secondary'}>{user.role}</Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                               <div className="flex flex-wrap gap-1">
                                    {user.role === 'Usuario' && user.roles && (
                                        <>
                                            <Badge variant="outline">A: {user.roles.asistencia}</Badge>
                                            <Badge variant="outline">S: {user.roles.semanas}</Badge>
                                            <Badge variant="outline">M: {user.roles.movilidad}</Badge>
                                        </>
                                    )}
                               </div>
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
                                    <EditUserDialog user={user} onUserUpdated={handleUserChange}>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            Editar
                                        </DropdownMenuItem>
                                    </EditUserDialog>
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
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario <span className="font-semibold">{user.name}</span>.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(user.id)} variant="destructive">
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
    )
}
