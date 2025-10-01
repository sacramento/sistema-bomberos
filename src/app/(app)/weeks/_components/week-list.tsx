
'use client';

import { useState, useMemo } from "react";
import { Week } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ArrowRight, User, Truck, MoreVertical, Edit, Trash2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import EditWeekDialog from "./edit-week-dialog";
import { deleteWeek } from "@/services/weeks.service";
import AddWeekDialog from "./add-week-dialog";


interface WeekListProps {
    weeks: Week[];
    isLoading?: boolean;
    onDataChange: () => void;
}

export default function WeekList({ weeks, isLoading, onDataChange }: WeekListProps) {
    const { user, getActiveRole } = useAuth();
    const { toast } = useToast();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);
    const canManage = useMemo(() => activeRole === 'Master' || activeRole === 'Administrador', [activeRole]);

     const handleDeleteWeek = async (weekId: string) => {
        try {
            await deleteWeek(weekId);
            toast({ title: "Éxito", description: "La semana y sus tareas asociadas han sido eliminadas." });
            onDataChange();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo eliminar la semana.", variant: "destructive" });
        }
    };


    if (isLoading) {
        return (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-5/6" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        );
    }
    
    // Filter weeks for non-admin/non-oficial users
    const filteredWeeks = useMemo(() => {
        if (!user || activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Oficial') {
            return weeks;
        }
        return weeks.filter(week => 
            week.allMembers?.some(member => member.legajo === user.id)
        );
    }, [weeks, user, activeRole]);
    
    if (filteredWeeks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">No hay semanas para mostrar</h2>
                     <p className="text-muted-foreground mt-2">
                        {user && (activeRole === 'Master' || activeRole === 'Administrador' || activeRole === 'Oficial')
                         ? 'Cree una nueva semana para comenzar.'
                         : 'No estás asignado a ninguna semana en esta categoría.'
                        }
                    </p>
                </div>
            </div>
        );
    }


    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredWeeks.map((week) => (
                <AlertDialog key={week.id}>
                    <Card className="flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="font-headline text-xl">{week.name}</CardTitle>
                                {canManage ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                            <EditWeekDialog week={week} onWeekUpdated={onDataChange}>
                                                 <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                                </DropdownMenuItem>
                                            </EditWeekDialog>
                                            <AddWeekDialog onWeekAdded={onDataChange} initialData={week}>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <Copy className="mr-2 h-4 w-4" /> Clonar
                                                </DropdownMenuItem>
                                            </AddWeekDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                     <Badge variant="secondary">{week.firehouse}</Badge>
                                )}
                            </div>
                            <CardDescription>
                                {format(new Date(week.periodStartDate), "dd 'de' LLL", { locale: es })} - {format(new Date(week.periodEndDate), "dd 'de' LLL, yyyy", { locale: es })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-muted-foreground"/>
                                <span className="font-medium">Encargado:</span>
                                <span className="text-muted-foreground">{week.lead?.lastName || 'N/A'}</span>
                            </div>
                             <div className="flex items-center gap-2 text-sm">
                                <Truck className="h-4 w-4 text-muted-foreground"/>
                                <span className="font-medium">Chofer:</span>
                                <span className="text-muted-foreground">{week.driver?.lastName || 'N/A'}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full" variant="outline">
                                <Link href={`/weeks/${week.id}`}>
                                    Ver Detalles <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente la semana "{week.name}" y todas sus tareas asociadas.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteWeek(week.id)} variant="destructive">
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                 </AlertDialog>
            ))}
        </div>
    )
}

    