
'use client';

import { useState, useMemo } from "react";
import { Week } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ArrowRight, User, Truck, MoreVertical, Edit, Trash2, Copy, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import EditWeekDialog from "./edit-week-dialog";
import { deleteWeek } from "@/services/weeks.service";
import AddWeekDialog from "./add-week-dialog";
import { cn } from "@/lib/utils";


interface WeekListProps {
    weeks: Week[];
    isLoading?: boolean;
    onDataChange: () => void;
}

const getBorderColor = (firehouse: Week['firehouse']) => {
    switch (firehouse) {
        case 'Cuartel 1': return 'border-yellow-500';
        case 'Cuartel 2': return 'border-blue-500';
        case 'Cuartel 3': return 'border-orange-500';
        default: return 'border-gray-500';
    }
};

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
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
               <Card key={index}>
                    <div className="p-4">
                        <Skeleton className="h-40 w-full" />
                    </div>
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
        <div className="space-y-4">
            {filteredWeeks.map((week) => (
                <AlertDialog key={week.id}>
                    <Card className={cn("flex flex-col sm:flex-row border-l-4", getBorderColor(week.firehouse))}>
                        <div className="flex-grow p-6">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <Badge variant="secondary" className="mb-2">{week.firehouse}</Badge>
                                    <h3 className="font-headline text-xl font-semibold">{week.name}</h3>
                                     <p className="text-sm text-muted-foreground">
                                        {format(new Date(week.periodStartDate), "dd 'de' LLL", { locale: es })} - {format(new Date(week.periodEndDate), "dd 'de' LLL, yyyy", { locale: es })}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                     {canManage && (
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
                                    )}
                                </div>
                            </div>
                           
                            <div className="border-t pt-4 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground"/>
                                    <div>
                                        <span className="font-medium">Encargado:</span>
                                        <p className="text-muted-foreground">{week.lead?.lastName || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-muted-foreground"/>
                                    <div>
                                        <span className="font-medium">Chofer:</span>
                                        <p className="text-muted-foreground">{week.driver?.lastName || 'N/A'}</p>
                                    </div>
                                </div>
                                 <div className="flex items-center gap-2">
                                    <Users2 className="h-4 w-4 text-muted-foreground"/>
                                    <div>
                                        <span className="font-medium">Integrantes:</span>
                                        <p className="text-muted-foreground">{week.allMembers?.length || 0} en total</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-center p-4 border-t sm:border-t-0 sm:border-l bg-muted/50">
                            <Button asChild className="w-full sm:w-auto" variant="outline">
                                <Link href={`/weeks/${week.id}`}>
                                    Ver Detalles <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
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
