
'use client';

import { useState, useMemo } from "react";
import { Week, Firefighter } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, User, Truck, MoreVertical, Edit, Trash2, Copy, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import EditWeekDialog from "./edit-week-dialog";
import { deleteWeek } from "@/services/weeks.service";
import AddWeekDialog from "./add-week-dialog";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";


interface WeekListProps {
    weeks: Week[];
    isLoading?: boolean;
    onDataChange: () => void;
    canManageGenerally: boolean;
    loggedInFirefighter: Firefighter | null;
}

const getBorderColor = (firehouse: Week['firehouse']) => {
    switch (firehouse) {
        case 'Cuartel 1': return 'border-yellow-500';
        case 'Cuartel 2': return 'border-blue-500';
        case 'Cuartel 3': return 'border-orange-500';
        default: return 'border-gray-500';
    }
};

export default function WeekList({ weeks, isLoading, onDataChange, canManageGenerally, loggedInFirefighter }: WeekListProps) {
    const { toast } = useToast();
    const { user, getActiveRole } = useAuth();
    const pathname = usePathname();
    const activeRole = getActiveRole(pathname);

    const canUserManageWeek = (week: Week) => {
        if (!user) return false;
        if (activeRole === 'Master') return true;
        
        // Administradores pueden gestionar cualquier semana de su cuartel
        if (activeRole === 'Administrador') {
            return loggedInFirefighter?.firehouse === week.firehouse;
        }

        // Encargados (del módulo) solo pueden gestionar si son el Lead específico de esta semana
        if (activeRole === 'Encargado') {
            return user.id === week.leadId;
        }

        return false;
    };

    const canUserViewDetails = (week: Week) => {
        if (!user) return false;
        // Roles de supervisión ven todo
        if (['Master', 'Administrador', 'Oficial'].includes(activeRole)) return true;
        
        // Bomberos y Encargados solo ven donde están asignados (Lead, Chofer o Miembro)
        return week.allMemberIds?.includes(user.id);
    };

    const handleDeleteWeek = async (weekId: string) => {
        if (!user) return;
        try {
            await deleteWeek(weekId, user);
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
    
    if (weeks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">No hay semanas para mostrar</h2>
                     <p className="text-muted-foreground mt-2">
                        {canManageGenerally
                         ? 'Cree una nueva semana para comenzar.'
                         : 'No hay guardias registradas en este cuartel.'
                        }
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {weeks.map((week) => {
                 const canViewDetails = canUserViewDetails(week);
                 const showManagementOptions = canUserManageWeek(week);

                return (
                <AlertDialog key={week.id}>
                    <Card className={cn("flex flex-col sm:flex-row border-l-4", getBorderColor(week.firehouse))}>
                        <div className="flex-grow p-6">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <Badge variant="secondary" className="mb-2">{week.firehouse}</Badge>
                                    <h3 className="font-headline text-xl font-semibold">{week.name}</h3>
                                </div>
                                <div className="flex-shrink-0">
                                     {showManagementOptions && (
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
                                                <AddWeekDialog onWeekAdded={onDataChange} initialData={week} loggedInFirefighter={loggedInFirefighter}>
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
                           
                            <Accordion type="single" collapsible className="w-full text-sm">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-2">
                                            <Users2 className="h-4 w-4 text-muted-foreground"/>
                                            <span className="font-medium">Ver Integrantes ({week.allMembers?.length || 0} en total)</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <ul className="space-y-3 pt-2 pl-2">
                                            {week.lead && (
                                                <li className="flex items-center gap-3">
                                                    <User className="h-4 w-4 text-muted-foreground"/>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">{`${week.lead.legajo} - ${week.lead.lastName}, ${week.lead.firstName}`}</span>
                                                        <Badge variant="outline">Encargado</Badge>
                                                    </div>
                                                </li>
                                            )}
                                            {week.driver && (
                                                 <li className="flex items-center gap-3">
                                                    <Truck className="h-4 w-4 text-muted-foreground"/>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">{`${week.driver.legajo} - ${week.driver.lastName}, ${week.driver.firstName}`}</span>
                                                        <Badge variant="outline">Chofer</Badge>
                                                    </div>
                                                </li>
                                            )}
                                            {week.members?.map(member => (
                                                <li key={member.id} className="flex items-center gap-3">
                                                    <div className="w-4 h-4 shrink-0" />
                                                    <p className="text-muted-foreground">{`${member.legajo} - ${member.lastName}, ${member.firstName}`}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>

                        </div>
                         {canViewDetails && (
                            <div className="flex items-center justify-center p-4 border-t sm:border-t-0 sm:border-l bg-muted/50">
                                <Button asChild className="w-full sm:w-auto" variant="outline">
                                    <Link href={`/weeks/${week.id}`}>
                                        Ver Detalles <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                         )}
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
            )})}
        </div>
    )
}
